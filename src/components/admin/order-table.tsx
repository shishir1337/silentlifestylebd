"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderStatus, StaffRole } from "@prisma/client";
import { Taka } from "@/components/ui/price";
import { Card, Pill, EmptyState, TableScroll } from "./admin-ui";
import { useToast } from "./toast";
import { PhoneIcon } from "@/components/ui/icons";
import { AlertIcon } from "./admin-icons";
import { bulkChangeOrderStatus, changeOrderStatus } from "@/lib/admin/order-actions";
import { primaryNext, TRANSITION_LABEL } from "@/lib/admin/order-flow";
import { OrderStatusMenu } from "./order-status-menu";
import { OrderQuickView } from "./order-quick-view";
import { ORDER_STATUS, STATUS_CHIP } from "@/lib/order-status";
import { formatOrderDate } from "@/lib/orders";
import type { AdminOrderRow } from "@/lib/admin/order-reads";
import { cn } from "@/lib/cn";

/**
 * The order queue.
 *
 * This is a call list before it is a table. A cash-on-delivery shop rings every
 * customer before dispatch, so the two things a row has to give up instantly
 * are the phone number and the one button that moves the order forward —
 * everything else is supporting detail.
 *
 * The button in each row is always the *forward* step, never the destructive
 * one — a button that appears in every row and sometimes cancels an order is a
 * mistap waiting to happen. Everything else the order can legally do is one
 * click further, in the Status menu beside it, where nobody hits it by accident
 * on the way to something else.
 *
 * Tapping the row opens it in a panel rather than navigating. The queue is
 * worked top to bottom with the filters the operator chose, and a page load
 * per order loses both their place and their filters.
 */
export function OrderTable({
  rows,
  filtered,
  role,
}: {
  rows: AdminOrderRow[];
  /** Whether any filter is active, so the empty state can say the right thing. */
  filtered: boolean;
  /** Decides which transitions are offered; the server checks it again. */
  role: StaffRole;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<string | null>(null);

  /**
   * Move one order.
   *
   * `from` is the status the screen was showing, which is what Undo needs and
   * what the server checks the row against — if somebody else moved it in the
   * meantime the change is refused rather than applied to a different order
   * than the one on screen.
   */
  function move(orderNo: string, from: OrderStatus, to: OrderStatus) {
    setBusy(orderNo);
    startTransition(async () => {
      const result = await changeOrderStatus(orderNo, to);
      setBusy(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${orderNo} — ${ORDER_STATUS[to].label.toLowerCase()}.`, () => {
        // Undo is a real transition back, audited like any other. It only
        // appears while the toast is alive, which is the window in which
        // "wrong button" is still the likely explanation.
        startTransition(async () => {
          const back = await changeOrderStatus(
            orderNo,
            from,
            "Undone straight after the change.",
          );
          if (!back.ok) toast.error(back.message);
          else router.refresh();
        });
      });
      router.refresh();
    });
  }

  function advance(row: AdminOrderRow) {
    const to = primaryNext(row.status);
    if (to) move(row.orderNo, row.status, to);
  }

  function runBulk(to: OrderStatus) {
    const orderNos = [...selected];
    setBusy("bulk");
    startTransition(async () => {
      const result = await bulkChangeOrderStatus(orderNos, to);
      setBusy(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSelected(new Set());
      toast.success(
        result.skipped === 0
          ? `${result.changed} ${result.changed === 1 ? "order" : "orders"} updated.`
          : `${result.changed} updated, ${result.skipped} skipped — they were not at the right step.`,
      );
      router.refresh();
    });
  }

  const toggle = (orderNo: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderNo)) next.delete(orderNo);
      else next.add(orderNo);
      return next;
    });

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.orderNo));

  if (rows.length === 0) {
    return (
      <EmptyState
        title={filtered ? "No orders match those filters" : "No orders yet"}
        body={
          filtered
            ? "Try a wider date range, or clear the filters to see everything."
            : "Orders appear here the moment a customer places one."
        }
      />
    );
  }

  return (
    <div>
      {/* --------------------------------------------------------- bulk bar */}
      {selected.size > 0 ? (
        <div className="sticky top-14 z-[var(--z-sticky)] mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-ink bg-ink px-3 py-2.5 text-white shadow-[var(--shadow-pop)] lg:top-0">
          <p className="tabular mr-1 text-[13px] font-medium">
            {selected.size} selected
          </p>
          {(["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] as OrderStatus[]).map((to) => (
            <button
              key={to}
              type="button"
              onClick={() => runBulk(to)}
              disabled={pending}
              className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-white/12 px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:bg-white/20 disabled:opacity-50"
            >
              {TRANSITION_LABEL[to]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2.5 text-[12.5px] font-medium text-white/70 hover:text-white"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* ------------------------------------------------------ table (md+) */}
      <Card className="hidden md:block">
        <TableScroll>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                <th scope="col" className="w-10 py-2.5 pl-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.orderNo)))
                    }
                    aria-label="Select all orders on this page"
                    className="size-4 accent-[var(--color-ink)]"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Order</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Customer</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Placed</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => {
                const next = primaryNext(row.status);
                const working = pending && busy === row.orderNo;
                return (
                  <tr
                    key={row.orderNo}
                    className={cn(
                      "transition-colors duration-[var(--dur-base)] hover:bg-subtle",
                      selected.has(row.orderNo) && "bg-subtle",
                    )}
                  >
                    <td className="py-2.5 pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(row.orderNo)}
                        onChange={() => toggle(row.orderNo)}
                        aria-label={`Select ${row.orderNo}`}
                        className="size-4 accent-[var(--color-ink)]"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/orders/${row.orderNo}`}
                        className="tabular text-[13px] font-semibold hover:text-brand"
                      >
                        {row.orderNo}
                      </Link>
                      <span className="mt-0.5 block text-[11.5px] text-ink-muted">
                        {row.itemCount} {row.itemCount === 1 ? "item" : "items"} ·{" "}
                        {row.area === "inside-dhaka" ? "Dhaka" : "Outside"}
                      </span>
                    </td>

                    <td className="px-3 py-2.5">
                      <span className="block text-[13px]">{row.customerName}</span>
                      {/*
                        The most-used control on this screen. Confirming a COD
                        order starts with a phone call, so the number is a link
                        rather than text to copy out.
                      */}
                      <a
                        href={`tel:${row.customerPhone}`}
                        className="tabular mt-0.5 inline-flex items-center gap-1 text-[12px] text-brand hover:underline"
                      >
                        <PhoneIcon className="size-3" />
                        {row.customerPhone}
                      </a>
                    </td>

                    <td className="px-3 py-2.5">
                      <span className="block text-[12.5px]">{formatOrderDate(row.placedAt)}</span>
                      {row.overdue ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-sale">
                          <AlertIcon className="size-3" />
                          over a day old
                        </span>
                      ) : null}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <Taka amount={row.total} className="text-[13px] font-semibold" />
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                          STATUS_CHIP[ORDER_STATUS[row.status].tone],
                        )}
                      >
                        {ORDER_STATUS[row.status].label}
                      </span>
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {next ? (
                          <button
                            type="button"
                            onClick={() => advance(row)}
                            disabled={working}
                            className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-ink px-2.5 text-[12.5px] font-medium text-white transition-[background-color,opacity] duration-[var(--dur-base)] hover:bg-ink/90 disabled:opacity-50"
                          >
                            {working ? "…" : TRANSITION_LABEL[next]}
                          </button>
                        ) : null}
                        <OrderStatusMenu
                          status={row.status}
                          role={role}
                          busy={working}
                          onPick={(to) => move(row.orderNo, row.status, to)}
                        />
                        <button
                          type="button"
                          onClick={() => setViewing(row.orderNo)}
                          className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      </Card>

      {/* ----------------------------------------------------- cards (<md) */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => {
          const next = primaryNext(row.status);
          const working = pending && busy === row.orderNo;
          return (
            <li
              key={row.orderNo}
              className={cn(
                "rounded-[var(--radius-md)] border bg-canvas p-3 shadow-[var(--shadow-card)]",
                row.overdue ? "border-sale/40" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/orders/${row.orderNo}`}
                    className="tabular text-[13.5px] font-semibold"
                  >
                    {row.orderNo}
                  </Link>
                  <p className="mt-0.5 text-[12.5px]">{row.customerName}</p>
                  <p className="text-[11.5px] text-ink-muted">
                    {formatOrderDate(row.placedAt)} · {row.itemCount}{" "}
                    {row.itemCount === 1 ? "item" : "items"} ·{" "}
                    {row.area === "inside-dhaka" ? "Dhaka" : "Outside"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Taka amount={row.total} className="text-[14px] font-semibold" />
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                      STATUS_CHIP[ORDER_STATUS[row.status].tone],
                    )}
                  >
                    {ORDER_STATUS[row.status].label}
                  </span>
                </div>
              </div>

              {row.overdue ? (
                <p className="mt-2 flex items-center gap-1 text-[12px] font-medium text-sale">
                  <AlertIcon className="size-3.5" />
                  Waiting over a day for a call
                </p>
              ) : null}

              <div className="mt-3 flex gap-2 border-t border-line pt-2.5">
                <a
                  href={`tel:${row.customerPhone}`}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium"
                >
                  <PhoneIcon className="size-4" />
                  Call
                </a>
                {next ? (
                  <button
                    type="button"
                    onClick={() => advance(row)}
                    disabled={working}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[13px] font-medium text-white disabled:opacity-50"
                  >
                    {working ? "Saving…" : TRANSITION_LABEL[next]}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setViewing(row.orderNo)}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium"
                >
                  View
                </button>
              </div>

              {/*
                The full menu goes under the two big buttons on a phone rather
                than beside them: thumbs reach the bottom of a card, and the
                one destructive move in here should not sit where the forward
                one does on the row above.
              */}
              <div className="mt-2 flex justify-end">
                <OrderStatusMenu
                  status={row.status}
                  role={role}
                  busy={working}
                  onPick={(to) => move(row.orderNo, row.status, to)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <OrderQuickView
        orderNo={viewing}
        role={role}
        busy={pending}
        onClose={() => setViewing(null)}
        onPick={(orderNo, to) => {
          const row = rows.find((r) => r.orderNo === orderNo);
          if (row) move(orderNo, row.status, to);
          setViewing(null);
        }}
      />
    </div>
  );
}
