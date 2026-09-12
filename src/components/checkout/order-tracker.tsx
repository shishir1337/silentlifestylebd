"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Taka } from "@/components/ui/price";
import { CashIcon, CheckIcon, PhoneIcon, SearchIcon, TruckIcon } from "@/components/ui/icons";
import { formatOrderDate, type Order } from "@/lib/orders";
import { getOrder } from "@/lib/order-storage";
import { useDeviceOrders } from "@/lib/use-device-orders";
import { delivery, site } from "@/data/site";

type Status = "idle" | "found" | "missing";

/**
 * Order lookup.
 *
 * Orders live in this browser's storage (there is no backend yet), so this can
 * only find orders placed on this device. That limit is stated on screen rather
 * than hidden — a tracker that silently fails to find a real order is worse
 * than one that explains itself and offers the phone number.
 */
export function OrderTracker() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [order, setOrder] = useState<Order | undefined>();
  const fieldRef = useRef<HTMLInputElement>(null);

  // Offer whatever this device already knows about, so most people never have
  // to type an order number at all.
  const recent = useDeviceOrders().orders.slice(0, 3);

  function lookup(id: string) {
    const trimmed = id.trim().toUpperCase();
    if (!trimmed) {
      fieldRef.current?.focus();
      return;
    }
    const found = getOrder(trimmed);
    setOrder(found);
    setStatus(found ? "found" : "missing");
  }

  return (
    <div className="pb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(input);
        }}
        className="max-w-xl"
      >
        <label htmlFor="order-id" className="block text-[13px] font-medium">
          Order number
        </label>
        <div className="mt-1.5 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-muted" />
            <input
              ref={fieldRef}
              id="order-id"
              name="order-id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="SLB-260913-ABCD"
              autoComplete="off"
              aria-describedby="order-id-hint"
              /* 16px min: anything smaller makes iOS Safari zoom on focus. */
              className="h-12 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface pr-3 pl-11 text-[16px] tracking-wide uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-sm)] bg-ink px-6 text-[15px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.98]"
          >
            Track order
          </button>
        </div>
        <p id="order-id-hint" className="mt-1.5 text-[12px] text-ink-muted">
          It looks like SLB-260913-ABCD and is on your order confirmation.
        </p>
      </form>

      {recent.length > 0 && status === "idle" ? (
        <section aria-labelledby="recent" className="mt-7">
          <h2 id="recent" className="text-[15px] font-semibold">
            Orders from this device
          </h2>
          <ul className="mt-3 space-y-2">
            {recent.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setInput(o.id);
                    lookup(o.id);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3 text-left transition-colors duration-[var(--dur-base)] hover:border-ink"
                >
                  <span className="min-w-0">
                    <span className="tabular block text-[14px] font-semibold">{o.id}</span>
                    <span className="block text-[12px] text-ink-muted">
                      {formatOrderDate(o.placedAt)} · {o.lines.length}{" "}
                      {o.lines.length === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <Taka amount={o.total} className="shrink-0 text-[14px] font-semibold" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status === "missing" ? (
        <div
          role="alert"
          className="mt-6 rounded-[var(--radius-md)] border border-line bg-subtle p-5"
        >
          <p className="text-[15px] font-medium">We can&apos;t find that order here</p>
          <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-ink-muted">
            Order tracking currently works only for orders placed on this phone or
            computer. If you ordered from another device — or over the phone — call us
            and we will look it up straight away.
          </p>
          <a
            href={`tel:${site.phone}`}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-ink px-5 text-sm font-medium text-white"
          >
            <PhoneIcon className="size-4" />
            <span className="tabular">{site.phoneDisplay}</span>
          </a>
        </div>
      ) : null}

      {status === "found" && order ? <OrderStatus order={order} /> : null}
    </div>
  );
}

function OrderStatus({ order }: { order: Order }) {
  const eta =
    order.area === "inside-dhaka" ? delivery.insideDhakaDays : delivery.outsideDhakaDays;

  // Without a backend there is no real courier status, so the tracker shows the
  // one stage it can honestly assert and says what follows — rather than
  // inventing a "shipped" state nobody updated.
  const steps = [
    { Icon: CheckIcon, title: "Order received", body: `Placed on ${formatOrderDate(order.placedAt)}.`, done: true },
    { Icon: PhoneIcon, title: "Confirmation call", body: "We call to confirm size and address before dispatch.", done: false },
    { Icon: TruckIcon, title: "Out for delivery", body: `Expected within ${eta} of confirmation.`, done: false },
    { Icon: CashIcon, title: "Paid on delivery", body: "Check the parcel, then pay the delivery man.", done: false },
  ];

  return (
    <section aria-labelledby="status" className="mt-7">
      <div className="rounded-[var(--radius-md)] border border-line p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="status" className="text-[17px] font-semibold">
            Order <span className="tabular">{order.id}</span>
          </h2>
          <Taka amount={order.total} className="text-lg font-semibold" />
        </div>

        <ol className="mt-5 space-y-4">
          {steps.map(({ Icon, title, body, done }) => (
            <li key={title} className="flex gap-3">
              <span
                className={
                  done
                    ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand"
                    : "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-ink-muted"
                }
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className={done ? "text-[14px] font-semibold" : "text-[14px] font-medium text-ink-soft"}>
                  {title}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[13px] font-semibold">Delivering to</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            {order.customer.name}
            <br />
            <span className="tabular">{order.customer.phone}</span>
            <br />
            {order.customer.address}
          </p>
        </div>

        <Link
          href={`/order/${order.id}`}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-5 text-sm font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
        >
          View full order
        </Link>
      </div>
    </section>
  );
}
