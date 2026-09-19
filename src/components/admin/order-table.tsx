"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderStatus, StaffRole } from "@prisma/client";
import { Taka } from "@/components/ui/price";
import { Card, EmptyState } from "./admin-ui";
import { useToast } from "./toast";
import { PhoneIcon } from "@/components/ui/icons";
import { AlertIcon } from "./admin-icons";
import { RelativeTime } from "./relative-time";
import {
  bulkChangeOrderStatus,
  bulkDeleteOrders,
  changeOrderStatus,
  deleteOrder,
} from "@/lib/admin/order-actions";
import { CAN_DELETE_ORDERS, can } from "@/lib/admin/roles";
import { primaryNext, TRANSITION_LABEL } from "@/lib/admin/order-flow";
import { OrderStatusMenu } from "./order-status-menu";
import { OrderQuickView } from "./order-quick-view";
import { ORDER_STATUS } from "@/lib/order-status";
import type { AdminOrderRow } from "@/lib/admin/order-reads";
import { cn } from "@/lib/cn";

/**
 * The order queue.
 *
 * This is a call list before it is a table. A cash-on-delivery shop rings every
 * customer before dispatch, so the two things a row has to give up instantly
 * are the phone number and the one move that takes the order forward.
 *
 * It is built for the operator working forty of these in a morning, which drove
 * every decision in it:
 *
 * **Density.** Nine rows fitted on a screen before, with more chrome above them
 * than three rows' worth. Tighter rows and a header that sticks make the list
 * the page rather than the thing underneath it.
 *
 * **One control per job.** The status chip *is* the status menu. It used to be
 * a chip, and then a button beside it labelled "Status" — two controls showing
 * one fact, on every row. The row itself opens the order, so the View button is
 * gone too. What is left in the last column is the single move that matters.
 *
 * **Keyboard.** ↑ and ↓ move a cursor, Enter opens the order, Space takes the
 * highlighted one a step forward. Somebody holding a phone has one hand left.
 *
 * **Triage.** Age is shown as age rather than as a date to subtract, and an
 * order waiting more than a day carries a red edge — so the queue is read by
 * looking rather than by reading.
 */
export function OrderTable({
  rows,
  filtered,
  role,
  now,
}: {
  rows: AdminOrderRow[];
  /** Whether any filter is active, so the empty state can say the right thing. */
  filtered: boolean;
  /** Decides which transitions are offered; the server checks it again. */
  role: StaffRole;
  /** Render time, so every row's "2h ago" agrees with every other. */
  now: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<string | null>(null);
  const [cursor, setCursor] = useState(-1);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  /**
   * Move one order.
   *
   * `from` is the status the screen was showing, which is what Undo needs and
   * what the server checks the row against — if somebody else moved it in the
   * meantime the change is refused rather than applied to a different order
   * than the one on screen.
   */
  const move = useCallback(
    (orderNo: string, from: OrderStatus, to: OrderStatus, note?: string) => {
      setBusy(orderNo);
      startTransition(async () => {
        const result = await changeOrderStatus(orderNo, to, note);
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
    },
    [router, toast],
  );

  const advance = useCallback(
    (row: AdminOrderRow) => {
      const to = primaryNext(row.status);
      if (to) move(row.orderNo, row.status, to);
    },
    [move],
  );

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

  /*
    Two taps, and the second one says the number out loud.

    Everything else on this bar is reversible by another button on the same
    bar. This is not, so it arms first and the confirming button repeats how
    many orders are about to stop existing — the difference between selecting
    three and selecting all forty is the whole question, and a plain "Delete"
    hides it.
  */
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);

  function runBulkDelete() {
    const orderNos = [...selected];
    setBusy("bulk");
    startTransition(async () => {
      const result = await bulkDeleteOrders(orderNos);
      setBusy(null);
      setConfirmingBulkDelete(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSelected(new Set());
      toast.success(
        result.skipped === 0
          ? `${result.deleted} ${result.deleted === 1 ? "order" : "orders"} deleted.`
          : `${result.deleted} deleted, ${result.skipped} could not be.`,
      );
      router.refresh();
    });
  }

  /*
    Deleting a single order from the list, for the same reason the bulk one is
    here: somebody clearing out test orders is looking at the list, not at one
    order they already opened. Owner-only, like every other route to this.

    Arms in place, and the armed state names the order — a row in a list of
    twenty-five is easy to lose track of between the tap and the confirmation.
  */
  const [confirmingRow, setConfirmingRow] = useState<string | null>(null);

  function removeOne(orderNo: string) {
    setBusy(orderNo);
    startTransition(async () => {
      const result = await deleteOrder(orderNo);
      setBusy(null);
      setConfirmingRow(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Order ${orderNo} deleted.`);
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

  /*
    Keyboard, for the person with a phone in their other hand.

    Ignored while focus is in a field, so typing a search term does not walk the
    cursor down the list, and while the panel is open, which has its own keys.
  */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (viewing) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setCursor((c) => Math.min(rows.length - 1, c + 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter" && cursor >= 0) {
        e.preventDefault();
        setViewing(rows[cursor].orderNo);
      } else if (e.key === " " && cursor >= 0) {
        e.preventDefault();
        advance(rows[cursor]);
      } else if (e.key === "Escape") {
        setCursor(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, cursor, viewing, advance]);

  // Keep the highlighted row on screen when the keyboard is driving.
  useEffect(() => {
    if (cursor < 0) return;
    bodyRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

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
        <div className="sticky top-14 z-[var(--z-sticky)] mb-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-ink bg-ink px-3 py-2 text-white shadow-[var(--shadow-pop)] lg:top-0">
          <p className="tabular mr-1 text-[13px] font-medium">{selected.size} selected</p>
          {/*
            Holding in bulk is the one selection a shop makes often: a size runs
            out, and every order waiting on it is parked in one action.
            Cancelling is not here, because a reason that fits fifty orders is
            not a reason.
          */}
          {/*
            "Back to pending" is here so a bulk action can be undone by the same
            control that made it. Holding thirty orders by mistake and then
            having to fix them one at a time is a worse mistake than the one it
            punishes.
          */}
          {(["CONFIRMED", "ON_HOLD", "PACKED", "SHIPPED", "DELIVERED", "PENDING"] as OrderStatus[]).map(
            (to) => (
              <button
                key={to}
                type="button"
                onClick={() => runBulk(to)}
                disabled={pending}
                className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-white/12 px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:bg-white/20 disabled:opacity-50"
              >
                {TRANSITION_LABEL[to]}
              </button>
            ),
          )}
          {/*
            Owner-only, and last. Clearing out the orders a shop placed while it
            was being built is the reason this exists; the server checks the
            role again, because a hidden button is a courtesy and not a lock.
          */}
          {can(role, CAN_DELETE_ORDERS) ? (
            confirmingBulkDelete ? (
              <>
                <button
                  type="button"
                  onClick={runBulkDelete}
                  disabled={pending}
                  className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-sale px-2.5 text-[12.5px] font-medium disabled:opacity-50"
                >
                  {pending
                    ? "Deleting…"
                    : `Yes, delete ${selected.size} permanently`}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingBulkDelete(false)}
                  className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-white/12 px-2.5 text-[12.5px] font-medium hover:bg-white/20"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingBulkDelete(true)}
                disabled={pending}
                className="inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2.5 text-[12.5px] font-medium text-white/70 transition-colors duration-[var(--dur-base)] hover:bg-sale hover:text-white disabled:opacity-50"
              >
                Delete
              </button>
            )
          ) : null}

          <button
            type="button"
            onClick={() => {
              setSelected(new Set());
              setConfirmingBulkDelete(false);
            }}
            className="ml-auto inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2.5 text-[12.5px] font-medium text-white/70 hover:text-white"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* ------------------------------------------------------ table (md+) */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full border-collapse text-left">
          {/*
            The header sticks to the top of the scrolling column. Twenty-five
            rows is more than a screen, and columns of bare numbers with their
            headings scrolled away is a table you have to scroll back up to read.
          */}
          <thead className="sticky top-0 z-10 bg-canvas">
            <tr className="border-b border-line text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
              <th scope="col" className="w-9 py-2 pl-3">
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
              <th scope="col" className="px-2.5 py-2 font-semibold">Order</th>
              <th scope="col" className="px-2.5 py-2 font-semibold">Customer</th>
              <th scope="col" className="px-2.5 py-2 font-semibold">Age</th>
              <th scope="col" className="px-2.5 py-2 text-right font-semibold">Total</th>
              <th scope="col" className="px-2.5 py-2 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>

          <tbody ref={bodyRef} className="divide-y divide-line">
            {rows.map((row, i) => {
              const next = primaryNext(row.status);
              const working = pending && busy === row.orderNo;
              const isSelected = selected.has(row.orderNo);
              return (
                <tr
                  key={row.orderNo}
                  onClick={() => setViewing(row.orderNo)}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    "cursor-pointer transition-colors duration-[var(--dur-base)]",
                    isSelected ? "bg-brand-tint/50" : cursor === i ? "bg-subtle" : "",
                  )}
                >
                  {/*
                    A red edge rather than a red row. A whole row in a warning
                    colour is hard to read, and forty of them is a page that
                    shouts without saying which one to pick up.
                  */}
                  <td
                    className={cn("py-1.5 pl-3", row.overdue && "border-l-2 border-l-sale")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(row.orderNo)}
                      aria-label={`Select ${row.orderNo}`}
                      className="size-4 accent-[var(--color-ink)]"
                    />
                  </td>

                  <td className="px-2.5 py-1.5">
                    <Link
                      href={`/admin/orders/${row.orderNo}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tabular text-[13px] font-semibold hover:text-brand"
                    >
                      {row.orderNo}
                    </Link>
                    <span className="mt-0.5 block text-[11.5px] text-ink-muted">
                      {row.itemCount} {row.itemCount === 1 ? "item" : "items"} ·{" "}
                      {row.area === "inside-dhaka" ? "Dhaka" : "Outside"}
                    </span>
                  </td>

                  <td className="px-2.5 py-1.5">
                    <span className="block truncate text-[13px]">{row.customerName}</span>
                    {/*
                      The most-used control on this screen. Confirming a COD
                      order starts with a phone call, so the number is a link
                      rather than text to copy out.
                    */}
                    <a
                      href={`tel:${row.customerPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tabular mt-0.5 inline-flex items-center gap-1 text-[12px] text-brand hover:underline"
                    >
                      <PhoneIcon className="size-3" />
                      {row.customerPhone}
                    </a>
                  </td>

                  <td className="px-2.5 py-1.5">
                    <RelativeTime
                      iso={row.placedAt}
                      now={now}
                      className={cn(
                        "block text-[12.5px]",
                        row.overdue ? "font-medium text-sale" : "text-ink-soft",
                      )}
                    />
                    {row.overdue ? (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-sale">
                        <AlertIcon className="size-3" />
                        needs a call
                      </span>
                    ) : null}
                  </td>

                  <td className="px-2.5 py-1.5 text-right">
                    <Taka amount={row.total} className="tabular text-[13px] font-semibold" />
                  </td>

                  <td className="px-2.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                    {/*
                      The chip is the menu. A chip saying "Confirmed" beside a
                      button saying "Status" was two controls for one fact, on
                      every row of the page.
                    */}
                    <OrderStatusMenu
                      status={row.status}
                      role={role}
                      busy={working}
                      variant="chip"
                      onPick={(to, why) => move(row.orderNo, row.status, to, why)}
                    />
                  </td>

                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                      {next ? (
                        <button
                          type="button"
                          onClick={() => advance(row)}
                          disabled={working}
                          className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-ink px-2.5 text-[12.5px] font-medium whitespace-nowrap text-white transition-[background-color,opacity] duration-[var(--dur-base)] hover:bg-ink/90 disabled:opacity-50"
                        >
                          {working ? "…" : TRANSITION_LABEL[next]}
                        </button>
                      ) : (
                        <span className="text-[12px] text-ink-muted">—</span>
                      )}

                      {can(role, CAN_DELETE_ORDERS) ? (
                        confirmingRow === row.orderNo ? (
                          <>
                            <button
                              type="button"
                              onClick={() => removeOne(row.orderNo)}
                              disabled={working}
                              className="ml-1.5 inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-sale px-2.5 text-[12.5px] font-medium whitespace-nowrap text-white disabled:opacity-50"
                            >
                              {working ? "…" : "Delete?"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingRow(null)}
                              className="ml-1 inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingRow(row.orderNo)}
                            aria-label={`Delete order ${row.orderNo}`}
                            className="ml-1.5 inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-transparent px-2 text-[12.5px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:border-sale/40 hover:text-sale"
                          >
                            Delete
                          </button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="mt-2 hidden text-[11.5px] text-ink-muted md:block">
        Click a row to open it. <Key>↑</Key> <Key>↓</Key> to move,{" "}
        <Key>Enter</Key> to open, <Key>Space</Key> to take the highlighted order
        one step forward.
      </p>

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
                row.overdue ? "border-l-2 border-sale/40 border-l-sale" : "border-line",
              )}
            >
              <button
                type="button"
                onClick={() => setViewing(row.orderNo)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <span className="tabular block text-[13.5px] font-semibold">
                    {row.orderNo}
                  </span>
                  <span className="mt-0.5 block text-[12.5px]">{row.customerName}</span>
                  <span className="block text-[11.5px] text-ink-muted">
                    <RelativeTime iso={row.placedAt} now={now} /> · {row.itemCount}{" "}
                    {row.itemCount === 1 ? "item" : "items"} ·{" "}
                    {row.area === "inside-dhaka" ? "Dhaka" : "Outside"}
                  </span>
                </div>
                {/*
                  The total only. The status lives on the chip in the actions
                  row below, which is also the control that changes it — showing
                  it twice made the card say one thing in two places and wrapped
                  the order number to fit.
                */}
                <Taka amount={row.total} className="tabular shrink-0 text-[14px] font-semibold" />
              </button>

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
                <OrderStatusMenu
                  status={row.status}
                  role={role}
                  busy={working}
                  variant="chip"
                  onPick={(to, why) => move(row.orderNo, row.status, to, why)}
                />
              </div>

              {can(role, CAN_DELETE_ORDERS) ? (
                confirmingRow === row.orderNo ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => removeOne(row.orderNo)}
                      disabled={working}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-sale text-[13px] font-medium text-white disabled:opacity-50"
                    >
                      {working ? "Deleting…" : `Yes, delete ${row.orderNo}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingRow(null)}
                      className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-4 text-[13px] font-medium"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingRow(row.orderNo)}
                    className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-sm)] text-[13px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:bg-sale hover:text-white"
                  >
                    Delete
                  </button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>

      <OrderQuickView
        orderNo={viewing}
        role={role}
        busy={pending}
        onClose={() => setViewing(null)}
        onPick={(orderNo, to, why) => {
          const row = rows.find((r) => r.orderNo === orderNo);
          if (row) move(orderNo, row.status, to, why);
          setViewing(null);
        }}
      />
    </div>
  );
}

/** A keycap, so the hint reads as keys rather than as prose. */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line-strong bg-subtle px-1 font-sans text-[10.5px] font-medium text-ink-soft">
      {children}
    </kbd>
  );
}
