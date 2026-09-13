"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderStatus, StaffRole } from "@prisma/client";
import { Taka } from "@/components/ui/price";
import { Card, Pill, SectionTitle } from "./admin-ui";
import { useToast } from "./toast";
import { PhoneIcon } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/field";
import { addOrderNote, changeOrderStatus } from "@/lib/admin/order-actions";
import { canTransition, NEXT_STATUSES, TRANSITION_LABEL } from "@/lib/admin/order-flow";
import { ORDER_FLOW, ORDER_STATUS, STATUS_CHIP, flowIndex } from "@/lib/order-status";
import { formatOrderDate } from "@/lib/orders";
import type { AdminOrderDetail } from "@/lib/admin/order-reads";
import { cn } from "@/lib/cn";

/**
 * One order, everything about it.
 *
 * The transitions offered are the legal ones for the current status and this
 * staff role — not a dropdown of all seven. An order that has been delivered
 * cannot go back to "waiting for a phone call", and a panel that offers the
 * choice will eventually have somebody take it.
 */
export function OrderDetail({
  order,
  role,
}: {
  order: AdminOrderDetail;
  role: StaffRole;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const status = ORDER_STATUS[order.status];
  const reached = flowIndex(order.status);
  const options = NEXT_STATUSES[order.status].filter((to) =>
    canTransition(role, order.status, to),
  );

  function move(to: OrderStatus, why?: string) {
    startTransition(async () => {
      const result = await changeOrderStatus(order.orderNo, to, why);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setCancelling(false);
      setReason("");
      toast.success(`Order ${order.orderNo} — ${ORDER_STATUS[to].label.toLowerCase()}.`);
      router.refresh();
    });
  }

  function saveNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const result = await addOrderNote(order.orderNo, note);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setNote("");
      toast.success("Note added.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* ================================================== left: the order */}
      <div className="space-y-5">
        {/* --- status + what to do next */}
        <Card className="p-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
                  STATUS_CHIP[status.tone],
                )}
              >
                {status.label}
              </span>
              <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-ink-soft">
                {status.detail}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {options.map((to) => {
                const destructive = to === "CANCELLED";
                return (
                  <button
                    key={to}
                    type="button"
                    disabled={pending}
                    onClick={() => (destructive ? setCancelling(true) : move(to))}
                    className={cn(
                      "inline-flex h-10 items-center rounded-[var(--radius-sm)] px-3.5 text-[13px] font-medium",
                      "transition-[background-color,border-color,opacity] duration-[var(--dur-base)] disabled:opacity-50",
                      destructive
                        ? "border border-line-strong text-ink-muted hover:border-sale hover:text-sale"
                        : "bg-ink text-white hover:bg-ink/90",
                    )}
                  >
                    {TRANSITION_LABEL[to]}
                  </button>
                );
              })}
              {options.length === 0 ? (
                <p className="text-[13px] text-ink-muted">
                  This order is finished — nothing more to do.
                </p>
              ) : null}
            </div>
          </div>

          {/* Cancelling asks for a reason, because the reason is what staff
              repeat to the customer on the phone. */}
          {cancelling ? (
            <div className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 p-3.5">
              <label htmlFor="cancel-reason" className="block text-[13px] font-medium">
                Why is this being cancelled?
              </label>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                Saved on the order, and it restores the stock.
              </p>
              <input
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer changed their mind"
                className={cn(inputClass(), "mt-2 h-10 bg-canvas")}
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={pending || !reason.trim()}
                  onClick={() => move("CANCELLED", reason)}
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-sale px-3.5 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Cancelling…" : "Cancel this order"}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : null}

          {/* A track, not a decoration: cancelled and returned orders have no
              place on a line that ends in "Delivered". */}
          {reached >= 0 ? (
            <ol className="mt-4 flex items-center gap-1 border-t border-line pt-4">
              {ORDER_FLOW.map((s, i) => (
                <li key={s} className="flex flex-1 items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      i <= reached ? "bg-brand" : "bg-muted",
                    )}
                  />
                  <span className="sr-only">
                    {ORDER_STATUS[s].label} {i <= reached ? "done" : "not yet"}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </Card>

        {/* --- items */}
        <Card>
          <SectionTitle>
            {order.items.length} {order.items.length === 1 ? "item" : "items"}
          </SectionTitle>
          <ul className="divide-y divide-line">
            {order.items.map((item, i) => (
              <li key={`${item.slug}-${item.size ?? ""}-${i}`} className="flex gap-3 p-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-subtle">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="56px"
                      quality={60}
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-[13.5px] font-medium hover:text-brand"
                  >
                    {item.name}
                  </Link>
                  <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                    {item.size ? `Size ${item.size} · ` : ""}
                    {item.qty} × <Taka amount={item.unitPrice} />
                  </p>
                </div>
                <Taka
                  amount={item.unitPrice * item.qty}
                  className="shrink-0 text-[13.5px] font-semibold"
                />
              </li>
            ))}
          </ul>

          <dl className="space-y-1.5 border-t border-line p-4 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd><Taka amount={order.subtotal} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">
                Delivery · {order.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
              </dt>
              <dd>
                {order.deliveryCharge === 0 ? (
                  <span className="font-medium text-brand">Free</span>
                ) : (
                  <Taka amount={order.deliveryCharge} />
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="text-[14px] font-semibold">Collect on delivery</dt>
              <dd><Taka amount={order.total} className="text-[18px] font-semibold" /></dd>
            </div>
          </dl>
        </Card>

        {/* --- history */}
        <Card className="print:hidden">
          <SectionTitle>History</SectionTitle>
          <ol className="divide-y divide-line">
            {order.events.map((e) => (
              <li key={e.id} className="px-4 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px]">
                    {e.toStatus ? (
                      <>
                        <span className="font-medium">{ORDER_STATUS[e.toStatus].label}</span>
                        {e.fromStatus ? (
                          <span className="text-ink-muted">
                            {" "}
                            (from {ORDER_STATUS[e.fromStatus].label.toLowerCase()})
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="font-medium">Note</span>
                    )}
                  </p>
                  <p className="tabular text-[11.5px] text-ink-muted">
                    {formatOrderDate(e.createdAt)}{" "}
                    {new Date(e.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {e.actor ? ` · ${e.actor}` : " · system"}
                  </p>
                </div>
                {e.note ? (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{e.note}</p>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="border-t border-line p-3">
            <label htmlFor="order-note" className="block text-[12px] font-medium">
              Add a note
            </label>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              Staff only. The customer never sees this.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                id="order-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Called, no answer — trying again at 5pm"
                className={cn(inputClass(), "h-10")}
              />
              <button
                type="button"
                onClick={saveNote}
                disabled={pending || !note.trim()}
                className="inline-flex h-10 shrink-0 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium hover:border-ink disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ============================================== right: the customer */}
      <div className="space-y-5">
        <Card className="p-4">
          <h2 className="text-[14px] font-semibold">Deliver to</h2>
          <p className="mt-2 text-[13.5px] font-medium">{order.customerName}</p>

          <div className="mt-2 space-y-1.5">
            <a
              href={`tel:${order.customerPhone}`}
              className="tabular inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-brand px-3 text-[13.5px] font-medium text-on-brand transition-colors duration-[var(--dur-base)] hover:bg-brand-hover print:hidden"
            >
              <PhoneIcon className="size-4" />
              {order.customerPhone}
            </a>
            {order.altPhone ? (
              <a
                href={`tel:${order.altPhone}`}
                className="tabular inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium print:hidden"
              >
                <PhoneIcon className="size-4" />
                {order.altPhone}
                <span className="text-ink-muted">alt</span>
              </a>
            ) : null}
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{order.address}</p>
          <p className="mt-1.5 text-[12px] text-ink-muted">
            {order.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
          </p>

          {order.note ? (
            <div className="mt-3 rounded-[var(--radius-sm)] bg-subtle px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                Customer note
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed">{order.note}</p>
            </div>
          ) : null}

          <div className="mt-3 border-t border-line pt-3">
            {order.account ? (
              <p className="text-[12.5px] text-ink-soft">
                Has an account —{" "}
                <span className="break-all">{order.account.email}</span>
              </p>
            ) : (
              <p className="text-[12.5px] text-ink-muted">
                Ordered as a guest. <Pill tone="off">No account</Pill>
              </p>
            )}
            <p className="tabular mt-1.5 text-[12px] text-ink-muted">
              Placed {formatOrderDate(order.placedAt)}
            </p>
          </div>
        </Card>

        <Card className="p-4 print:hidden">
          <h2 className="text-[14px] font-semibold">Packing slip</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
            Prints the items, the address and the amount to collect. Nothing else
            on the page prints.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
          >
            Print
          </button>
        </Card>
      </div>
    </div>
  );
}
