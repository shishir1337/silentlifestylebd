"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderStatus, StaffRole } from "@prisma/client";
import { NEXT_STATUSES, TRANSITION_LABEL, canTransition } from "@/lib/admin/order-flow";
import { ORDER_STATUS } from "@/lib/order-status";
import { cn } from "@/lib/cn";

/**
 * Every move this order can actually make, from the row it is on.
 *
 * The list used to offer one button — the forward step — and everything else
 * meant opening the order. That is right for the common case and wrong for the
 * rest of the day: an order that has to be cancelled, or one packed before it
 * was marked confirmed, cost a page load each.
 *
 * What it does not offer is a free choice of all seven statuses. `NEXT_STATUSES`
 * says which moves are real, and the reason is in that file: an order cannot go
 * back to "pending" after it has been delivered, and cancelling twice would
 * restore the same stock twice. Where a move is missing, the menu says why
 * rather than leaving the client to wonder whether it is a bug.
 */
export function OrderStatusMenu({
  status,
  role,
  busy,
  onPick,
  align = "right",
}: {
  status: OrderStatus;
  role: StaffRole;
  busy?: boolean;
  onPick: (to: OrderStatus) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const choices = NEXT_STATUSES[status].filter((to) => canTransition(role, status, to));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (choices.length === 0) {
    return (
      <span className="text-[11.5px] text-ink-muted">
        {status === "CANCELLED" ? "Cancelled — final" : "Returned — final"}
      </span>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:opacity-50"
      >
        Status
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={cn("size-3 transition-transform duration-[var(--dur-base)]", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-20 mt-1 w-[232px] overflow-hidden rounded-[var(--radius-md)] border border-line bg-canvas py-1 shadow-[var(--shadow-pop)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            Now {ORDER_STATUS[status].label}
          </p>
          {choices.map((to) => {
            const undoing = to === "CANCELLED" || to === "RETURNED";
            return (
              <button
                key={to}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onPick(to);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors duration-[var(--dur-base)] hover:bg-muted",
                  undoing && "text-sale",
                )}
              >
                {TRANSITION_LABEL[to]}
                {undoing ? (
                  <span className="ml-auto text-[11px] text-ink-muted">restocks</span>
                ) : null}
              </button>
            );
          })}
          <p className="border-t border-line px-3 pt-1.5 pb-1 text-[11px] leading-snug text-ink-muted">
            {status === "DELIVERED"
              ? "A delivered order can only be returned."
              : "Earlier steps are not offered — an order does not move backwards."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
