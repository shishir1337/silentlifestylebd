"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Taka } from "@/components/ui/price";
import { Field, inputClass } from "@/components/ui/field";
import { CashIcon, CheckIcon, PhoneIcon, SearchIcon, TruckIcon } from "@/components/ui/icons";
import { formatOrderDate } from "@/lib/orders";
import { myRecentOrders, trackOrder } from "@/lib/order-actions";
import { ORDER_STATUS, STATUS_CHIP, flowIndex } from "@/lib/order-status";
import type { OrderView } from "@/lib/order-reads";
import { useSettings } from "@/lib/site-settings";
import { cn } from "@/lib/cn";

type Screen = "idle" | "found" | "missing" | "blocked";

/**
 * Order lookup.
 *
 * Orders are rows now, so this finds them wherever they were placed — the old
 * version could only see what was in this browser's storage, and said so.
 *
 * A guest proves entitlement with the order number **and** the mobile number
 * the order was placed with. Neither alone is enough: order numbers are four
 * characters and meant to be read aloud, and phone numbers are eleven digits
 * with a known prefix. Orders placed on this device need no proof at all — the
 * signed cookie already carries it.
 *
 * The recent list is fetched after mount rather than rendered on the server, so
 * `/track` stays a prerendered static page instead of rendering per request for
 * the sake of a list that is usually empty.
 */
export function OrderTracker() {
  const site = useSettings();
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [screen, setScreen] = useState<Screen>("idle");
  const [blocked, setBlocked] = useState("");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [recent, setRecent] = useState<OrderView[]>([]);
  const [busy, setBusy] = useState(false);
  const orderRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    myRecentOrders()
      .then((rows) => {
        if (!cancelled) setRecent(rows);
      })
      .catch(() => {
        // An empty list is the same as not having asked; nothing to report.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orderNo.trim()) return orderRef.current?.focus();
    if (!phone.trim()) return phoneRef.current?.focus();

    setBusy(true);
    try {
      const result = await trackOrder(orderNo, phone);
      if (!result.ok) {
        // Refused rather than not found — the shop can still help by phone,
        // and saying "we can't find it" here would be untrue.
        setOrder(null);
        setBlocked(result.message);
        setScreen("blocked");
        return;
      }
      setOrder(result.order);
      setScreen(result.order ? "found" : "missing");
    } catch {
      setOrder(null);
      setScreen("missing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-4">
      <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4">
        <Field
          label="Order number"
          id="order-id"
          hint="It looks like SLB-260913-ABCD and is on your order confirmation."
        >
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-muted" />
            <input
              ref={orderRef}
              id="order-id"
              name="order-id"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="SLB-260913-ABCD"
              autoComplete="off"
              aria-describedby="order-id-hint"
              className={cn(
                inputClass(),
                "h-12 pr-3 pl-11 tracking-wide uppercase placeholder:normal-case placeholder:tracking-normal",
              )}
            />
          </div>
        </Field>

        <Field
          label="Mobile number on the order"
          id="order-phone"
          hint="So we only show your order to you."
        >
          <input
            ref={phoneRef}
            id="order-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01712345678"
            aria-describedby="order-phone-hint"
            className={cn(inputClass(), "h-12")}
          />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-sm)] bg-ink px-6 text-[15px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Looking…" : "Track order"}
        </button>
      </form>

      {recent.length > 0 && screen === "idle" ? (
        <section aria-labelledby="recent" className="mt-7">
          <h2 id="recent" className="text-[15px] font-semibold">
            Your recent orders
          </h2>
          <ul className="mt-3 space-y-2">
            {recent.map((o) => (
              <li key={o.orderNo}>
                {/* Straight to the order: this browser already has the right
                    to open it, so asking for the phone number again would be
                    ceremony, not security. */}
                <Link
                  href={`/order/${o.orderNo}`}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3 text-left transition-colors duration-[var(--dur-base)] hover:border-ink"
                >
                  <span className="min-w-0">
                    <span className="tabular block text-[14px] font-semibold">
                      {o.orderNo}
                    </span>
                    <span className="block text-[12px] text-ink-muted">
                      {formatOrderDate(o.placedAt)} · {ORDER_STATUS[o.status].label}
                    </span>
                  </span>
                  <Taka amount={o.total} className="shrink-0 text-[14px] font-semibold" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {screen === "blocked" ? (
        <div
          role="alert"
          className="mt-6 rounded-[var(--radius-md)] border border-line bg-subtle p-5"
        >
          <p className="text-[15px] font-medium">We can&apos;t check that right now</p>
          <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-ink-muted">
            {blocked}
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

      {screen === "missing" ? (
        <div
          role="alert"
          className="mt-6 rounded-[var(--radius-md)] border border-line bg-subtle p-5"
        >
          <p className="text-[15px] font-medium">We can&apos;t find that order</p>
          <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-ink-muted">
            Check the order number and make sure the mobile number is the one the
            order was placed with. If it still does not come up, call us and we will
            look it up straight away.
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

      {screen === "found" && order ? <OrderProgress order={order} /> : null}
    </div>
  );
}

function OrderProgress({ order }: { order: OrderView }) {
  const { delivery } = useSettings();
  const eta =
    order.area === "inside-dhaka" ? delivery.insideDhakaDays : delivery.outsideDhakaDays;
  const status = ORDER_STATUS[order.status];
  const reached = flowIndex(order.status);

  /**
   * The real status from the database, not a fixed script.
   *
   * The previous version drew the same four steps with only the first ticked,
   * because there was nothing to read — it was honest about that at the time.
   * Staff move the order through these stages in the admin panel now, so the
   * ticks mean something.
   */
  const steps = [
    { Icon: CheckIcon, title: "Order received", body: `Placed on ${formatOrderDate(order.placedAt)}.` },
    { Icon: PhoneIcon, title: "Confirmed", body: "We call to check size and address before dispatch." },
    { Icon: TruckIcon, title: "Packed", body: "Your parcel is ready for the courier." },
    { Icon: TruckIcon, title: "Out for delivery", body: `Usually ${eta} from confirmation.` },
    { Icon: CashIcon, title: "Delivered", body: "Check the parcel, then pay the delivery man." },
  ];

  const stopped = reached === -1;

  return (
    <section aria-labelledby="status" className="mt-7">
      <div className="rounded-[var(--radius-md)] border border-line p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="status" className="text-[17px] font-semibold">
            Order <span className="tabular">{order.orderNo}</span>
          </h2>
          <Taka amount={order.total} className="text-lg font-semibold" />
        </div>

        <p
          className={cn(
            "mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase",
            STATUS_CHIP[status.tone],
          )}
        >
          {status.label}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{status.detail}</p>

        {/* Cancelled and returned orders have no place on a track that ends in
            "Delivered"; showing one would imply a parcel still on its way. */}
        {!stopped ? (
          <ol className="mt-5 space-y-4">
            {steps.map(({ Icon, title, body }, i) => {
              const done = i <= reached;
              return (
                <li key={title} className="flex gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-brand text-on-brand" : "bg-muted text-ink-muted",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[14px]",
                        done ? "font-semibold" : "font-medium text-ink-soft",
                      )}
                    >
                      {title}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[13px] font-semibold">Delivering to</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            {order.customerName}
            <br />
            <span className="tabular">{order.customerPhone}</span>
            <br />
            {order.address}
          </p>
        </div>
      </div>
    </section>
  );
}
