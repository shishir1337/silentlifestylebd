"use client";

import Link from "next/link";
import Image from "next/image";
import { Taka } from "@/components/ui/price";
import { ButtonLink } from "@/components/ui/button";
import { BagIcon, CashIcon, ChevronRightIcon, PinIcon, TruckIcon } from "@/components/ui/icons";
import { useDeviceOrders } from "@/lib/use-device-orders";
import { useAddresses, useProfile, defaultAddress } from "@/lib/account";
import { formatOrderDate } from "@/lib/orders";
import { delivery } from "@/data/site";

/**
 * Dashboard overview.
 *
 * Three numbers, the most recent orders, and the default address — the answers
 * to "what did I spend", "where is my last parcel" and "where is it going",
 * which is what a customer opens an account page to find.
 */
export function AccountOverview() {
  const { orders, ready: ordersReady } = useDeviceOrders();
  const { profile, ready: profileReady } = useProfile();
  const { addresses, ready: addressReady } = useAddresses();

  if (!ordersReady || !profileReady || !addressReady) {
    return <div className="py-20" aria-busy="true" />;
  }

  const spent = orders.reduce((sum, o) => sum + o.total, 0);
  const items = orders.reduce((sum, o) => sum + o.lines.reduce((n, l) => n + l.qty, 0), 0);
  const recent = orders.slice(0, 3);
  const home = defaultAddress(addresses);
  const firstName = profile.name.trim().split(" ")[0];

  return (
    <div className="pb-4">
      <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
        {firstName ? `Welcome back, ${firstName}` : "My account"}
      </h1>
      <p className="mt-1.5 text-[14px] text-ink-soft">
        Your orders, addresses and details — all kept on this device.
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-2.5">
        <Stat Icon={BagIcon} label="Orders" value={String(orders.length)} />
        <Stat Icon={TruckIcon} label="Items" value={String(items)} />
        <Stat Icon={CashIcon} label="Spent" value={<Taka amount={spent} />} />
      </dl>

      <section aria-labelledby="recent-orders" className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="recent-orders" className="text-[17px] font-semibold">
            Recent orders
          </h2>
          {orders.length > 3 ? (
            <Link
              href="/account/orders"
              className="inline-flex min-h-6 items-center gap-0.5 text-[13px] font-medium text-brand"
            >
              See all
              <ChevronRightIcon className="size-4" />
            </Link>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-line bg-subtle px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-ink-muted">
              <BagIcon className="size-6" />
            </span>
            <p className="text-[15px] font-medium">No orders yet</p>
            <p className="max-w-sm text-[13px] text-ink-muted">
              When you place an order it will appear here with its status.
            </p>
            <ButtonLink href="/collections" className="mt-1">
              Start shopping
            </ButtonLink>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/order/${o.id}`}
                  className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 transition-colors duration-[var(--dur-base)] hover:border-ink"
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-subtle">
                    <Image
                      src={o.lines[0].image}
                      alt=""
                      fill
                      sizes="56px"
                      quality={60}
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="tabular block text-[13px] font-semibold">{o.id}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-muted">
                      {formatOrderDate(o.placedAt)} · {o.lines.length}{" "}
                      {o.lines.length === 1 ? "item" : "items"}
                    </span>
                    <span className="mt-1 inline-flex items-center rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
                      Confirmation pending
                    </span>
                  </span>
                  <Taka amount={o.total} className="shrink-0 text-[14px] font-semibold" />
                  <ChevronRightIcon className="size-4 shrink-0 text-ink-muted transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="default-address" className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="default-address" className="text-[17px] font-semibold">
            Default address
          </h2>
          <Link
            href="/account/addresses"
            className="inline-flex min-h-6 items-center gap-0.5 text-[13px] font-medium text-brand"
          >
            Manage
            <ChevronRightIcon className="size-4" />
          </Link>
        </div>

        {home ? (
          <div className="mt-3 flex gap-3 rounded-[var(--radius-md)] border border-line p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
              <PinIcon className="size-[18px]" />
            </span>
            <div className="min-w-0 text-[13px] leading-relaxed">
              <p className="font-semibold">{home.label}</p>
              <p className="mt-0.5 text-ink-soft">
                {home.recipient}
                <br />
                <span className="tabular">{home.phone}</span>
                <br />
                {home.address}
              </p>
              <p className="mt-1 text-[12px] text-ink-muted">
                {home.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"} ·{" "}
                <Taka
                  amount={
                    home.area === "inside-dhaka"
                      ? delivery.insideDhaka
                      : delivery.outsideDhaka
                  }
                />{" "}
                delivery
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-[var(--radius-md)] border border-dashed border-line-strong p-5 text-center">
            <p className="text-[14px] text-ink-soft">No address saved yet.</p>
            <ButtonLink href="/account/addresses" variant="secondary" size="sm" className="mt-3">
              Add an address
            </ButtonLink>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: (p: { className?: string }) => React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-subtle p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="tabular mt-1.5 text-[18px] font-semibold sm:text-[20px]">{value}</dd>
    </div>
  );
}
