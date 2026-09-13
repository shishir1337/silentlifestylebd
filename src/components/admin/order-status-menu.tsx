"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderStatus, StaffRole } from "@prisma/client";
import { HELD, ORDER_FLOW, RESTOCKING, transitionsFrom } from "@/lib/admin/order-flow";
import { ORDER_STATUS } from "@/lib/order-status";
import { cn } from "@/lib/cn";

/**
 * Move this order anywhere.
 *
 * Every status, not just the next one. The list used to offer the single step
 * along a one-way path, which is right for the common case and wrong for the
 * rest of the day — a mistap marks something delivered, a customer rings back
 * about a cancelled order, a parcel is packed before anyone confirmed it. The
 * panel's job is to let the operator record what happened, not to argue about
 * the order it happened in.
 *
 * Cancelling asks for its reason here rather than failing with one. It is what
 * staff repeat to the customer on the phone, so it is still required — but
 * offering a button and then refusing it is the panel wasting somebody's time,
 * and that is what this used to do.
 */

/** A dot in the status colour, so the list is scannable rather than read. */
function Dot({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = ORDER_STATUS[status].tone;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "neutral" && "bg-ink-muted",
        tone === "progress" && "bg-ink",
        tone === "held" && "bg-[var(--color-hold)]",
        tone === "done" && "bg-brand",
        tone === "stopped" && "bg-sale",
        className,
      )}
    />
  );
}

export function OrderStatusMenu({
  status,
  role,
  busy,
  onPick,
  align = "right",
  trigger = "Status",
}: {
  status: OrderStatus;
  role: StaffRole;
  busy?: boolean;
  /** `note` carries the cancellation reason when there is one. */
  onPick: (to: OrderStatus, note?: string) => void;
  align?: "left" | "right";
  trigger?: string;
}) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState("");
  const box = useRef<HTMLDivElement>(null);

  const choices = transitionsFrom(role, status);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  function close() {
    setOpen(false);
    setAsking(null);
    setReason("");
  }

  function pick(to: OrderStatus) {
    if (to === "CANCELLED") {
      setAsking(to);
      return;
    }
    close();
    onPick(to);
  }

  if (choices.length === 0) return null;

  /** Three groups: the normal path, parking it, then the two that end it. */
  const flow = choices.filter((s) => ORDER_FLOW.includes(s));
  const held = choices.filter((s) => s === HELD);
  const ending = choices.filter((s) => RESTOCKING.includes(s));

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:opacity-50"
      >
        <Dot status={status} />
        {trigger}
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
            "absolute z-20 mt-1 w-[250px] overflow-hidden rounded-[var(--radius-md)] border border-line bg-canvas shadow-[var(--shadow-pop)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {asking ? (
            <div className="p-3">
              <label htmlFor="cancel-reason" className="block text-[12.5px] font-medium">
                Why is this being cancelled?
              </label>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
                Staff repeat this to the customer. It is kept on the order.
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {["Customer changed their mind", "Could not reach the customer", "Out of stock"].map(
                  (r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={cn(
                        "inline-flex h-7 items-center rounded-full border px-2 text-[11.5px] transition-colors duration-[var(--dur-base)]",
                        reason === r
                          ? "border-ink bg-ink text-white"
                          : "border-line-strong hover:border-ink",
                      )}
                    >
                      {r}
                    </button>
                  ),
                )}
              </div>

              <textarea
                id="cancel-reason"
                rows={2}
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Or write your own"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-2.5 py-2 text-[13px]"
              />

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!reason.trim()}
                  onClick={() => {
                    const note = reason.trim();
                    close();
                    onPick("CANCELLED", note);
                  }}
                  className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-sale px-2.5 text-[12.5px] font-medium text-white disabled:opacity-40"
                >
                  Cancel the order
                </button>
                <button
                  type="button"
                  onClick={() => setAsking(null)}
                  className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="py-1">
              <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                Move to
              </p>

              {flow.map((to) => (
                <Row key={to} to={to} onClick={() => pick(to)} />
              ))}

              {held.length > 0 ? (
                <div className="mt-1 border-t border-line pt-1">
                  {held.map((to) => (
                    <Row key={to} to={to} onClick={() => pick(to)} />
                  ))}
                  <p className="px-3 pt-0.5 pb-1 text-[11px] leading-snug text-ink-muted">
                    Keeps the goods reserved. Use it when you cannot reach the
                    customer yet.
                  </p>
                </div>
              ) : null}

              {ending.length > 0 ? (
                <div className="mt-1 border-t border-line pt-1">
                  {ending.map((to) => (
                    <Row key={to} to={to} tone="sale" onClick={() => pick(to)} />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Row({
  to,
  tone,
  onClick,
}: {
  to: OrderStatus;
  tone?: "sale";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors duration-[var(--dur-base)] hover:bg-muted",
        tone === "sale" && "text-sale",
      )}
    >
      <Dot status={to} />
      {ORDER_STATUS[to].label}
      {RESTOCKING.includes(to) ? (
        <span className="ml-auto text-[11px] text-ink-muted">restocks</span>
      ) : null}
    </button>
  );
}
