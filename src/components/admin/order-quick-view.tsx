"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { OrderStatus, StaffRole } from "@prisma/client";
import { Taka } from "@/components/ui/price";
import { PhoneIcon } from "@/components/ui/icons";
import { CloseIcon } from "./admin-icons";
import { OrderStatusMenu } from "./order-status-menu";
import { fetchOrder } from "@/lib/admin/order-actions";
import { ORDER_STATUS, STATUS_CHIP } from "@/lib/order-status";
import { formatOrderDate } from "@/lib/orders";
import type { AdminOrderDetail } from "@/lib/admin/order-reads";
import { cn } from "@/lib/cn";
import { useOverlay } from "@/lib/use-overlay";

/**
 * The order, without leaving the list.
 *
 * Confirming a cash-on-delivery order is a phone call: read the items back,
 * check the address, then move the status. Doing that from the detail page
 * costs two navigations per order and loses the filters the operator set up —
 * on a queue of forty that is the whole morning.
 *
 * It is a panel rather than a modal box because the list behind it is the
 * context: the operator is working down it, and seeing where they are matters.
 *
 * The contents are fetched when it opens. Twenty-five orders' worth of line
 * items, addresses and history sent with every page would make the list slower
 * for everyone to make one panel instant for somebody.
 */
export function OrderQuickView({
  orderNo,
  role,
  onClose,
  onPick,
  busy,
}: {
  orderNo: string | null;
  role: StaffRole;
  onClose: () => void;
  onPick: (orderNo: string, to: OrderStatus, note?: string) => void;
  busy: boolean;
}) {
  const open = orderNo !== null;
  const { mounted, ref: attach, node } = useOverlay(open);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!orderNo) return;
    let live = true;
    setOrder(null);
    setFailed(false);
    fetchOrder(orderNo)
      .then((o) => {
        if (live) {
          if (o) setOrder(o);
          else setFailed(true);
        }
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [orderNo]);

  // The browser closes a <dialog> by itself on Escape; React has to be told.
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const onCloseEvent = () => onClose();
    el.addEventListener("close", onCloseEvent);
    return () => el.removeEventListener("close", onCloseEvent);
  }, [node, onClose, mounted]);

  if (!mounted) return null;

  return (
    <dialog
      ref={attach}
      aria-label={`Order ${orderNo}`}
      className="admin-quickview m-0 ml-auto h-dvh max-h-none w-full max-w-[min(440px,100vw)] bg-canvas p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="tabular text-[14px] font-semibold">{orderNo}</p>
            {order ? (
              <p className="mt-0.5 text-[12px] text-ink-muted">
                Placed {formatOrderDate(order.placedAt)}
              </p>
            ) : null}
          </div>
          {order ? (
            <span
              className={cn(
                "ml-auto inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                STATUS_CHIP[ORDER_STATUS[order.status].tone],
              )}
            >
              {ORDER_STATUS[order.status].label}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] hover:bg-muted"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {failed ? (
            <p role="alert" className="text-[13.5px] text-sale">
              That order could not be loaded. It may have just been deleted.
            </p>
          ) : !order ? (
            <div aria-busy="true" className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-[var(--radius-sm)] bg-muted"
                />
              ))}
            </div>
          ) : (
            <>
              {/* The call comes first: this is a phone-call screen. */}
              <section>
                <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  Customer
                </h2>
                <p className="mt-1.5 text-[14px] font-medium">{order.customerName}</p>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="tabular mt-1 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-brand-tint px-2.5 text-[13px] font-medium text-brand"
                >
                  <PhoneIcon className="size-3.5" />
                  {order.customerPhone}
                </a>
                {order.altPhone ? (
                  <a
                    href={`tel:${order.altPhone}`}
                    className="tabular ml-1.5 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-2.5 text-[13px]"
                  >
                    {order.altPhone}
                  </a>
                ) : null}
                <p className="mt-2.5 text-[13px] leading-relaxed">{order.address}</p>
                <p className="mt-1 text-[12px] text-ink-muted">
                  {order.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                  {order.account ? ` · account: ${order.account.email}` : " · guest"}
                </p>
                {order.note ? (
                  <p className="mt-2 rounded-[var(--radius-sm)] bg-muted px-3 py-2 text-[12.5px] leading-relaxed">
                    “{order.note}”
                  </p>
                ) : null}
              </section>

              <section className="mt-5">
                <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  {order.items.length} {order.items.length === 1 ? "item" : "items"}
                </h2>
                <ul className="mt-2 space-y-2">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex gap-2.5">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-muted">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            sizes="48px"
                            quality={60}
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-snug">{item.name}</p>
                        <p className="mt-0.5 text-[12px] text-ink-muted">
                          {item.color ? `${item.color} · ` : ""}
                          {item.size ? `Size ${item.size} · ` : ""}
                          {item.qty} × <Taka amount={item.unitPrice} />
                        </p>
                      </div>
                      <Taka
                        amount={item.unitPrice * item.qty}
                        className="shrink-0 text-[13px] font-medium"
                      />
                    </li>
                  ))}
                </ul>

                <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Subtotal</dt>
                    <dd><Taka amount={order.subtotal} /></dd>
                  </div>
                  {order.discount > 0 ? (
                    <div className="flex justify-between text-brand">
                      <dt>Discount{order.couponCode ? ` · ${order.couponCode}` : ""}</dt>
                      <dd className="font-medium">
                        −<Taka amount={order.discount} />
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Delivery</dt>
                    <dd>
                      {order.deliveryCharge === 0 ? "Free" : <Taka amount={order.deliveryCharge} />}
                    </dd>
                  </div>
                  <div className="flex justify-between text-[15px] font-semibold">
                    <dt>Cash on delivery</dt>
                    <dd><Taka amount={order.total} /></dd>
                  </div>
                </dl>
              </section>

              {order.events.length > 0 ? (
                <section className="mt-5">
                  <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                    History
                  </h2>
                  <ul className="mt-2 space-y-1.5">
                    {order.events.slice(0, 6).map((e) => (
                      <li key={e.id} className="text-[12px] leading-snug text-ink-muted">
                        <span className="text-ink">
                          {e.toStatus ? ORDER_STATUS[e.toStatus].label : "Note"}
                        </span>
                        {e.note ? ` — ${e.note}` : ""} ·{" "}
                        {formatOrderDate(e.createdAt)}
                        {e.actor ? ` · ${e.actor}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>

        {order ? (
          <div className="flex items-center gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <OrderStatusMenu
              status={order.status}
              role={role}
              busy={busy}
              align="left"
              onPick={(to, why) => onPick(order.orderNo, to, why)}
            />
            <Link
              href={`/admin/orders/${order.orderNo}`}
              className="ml-auto inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[12.5px] font-medium hover:border-ink"
            >
              Open full order
            </Link>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
