import Link from "next/link";
import Image from "next/image";
import { Taka } from "@/components/ui/price";
import { ButtonLink } from "@/components/ui/button";
import { BagIcon, ChevronRightIcon, PhoneIcon } from "@/components/ui/icons";
import { formatOrderDate } from "@/lib/orders";
import { ORDER_STATUS, STATUS_CHIP } from "@/lib/order-status";
import type { OrderView } from "@/lib/order-reads";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/**
 * Order history.
 *
 * A Server Component reading real rows. The status badge said "Confirmation
 * pending" on every order before, because there was nothing behind it and a
 * "Shipped" badge nobody updated would have been a lie a customer acts on.
 * Staff move the status in the admin panel now, so it says what is true.
 */
export function AccountOrders({ orders }: { orders: OrderView[] }) {
  return (
    <div className="pb-4">
      <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
        Orders
      </h1>
      <p className="mt-1.5 text-[14px] text-ink-soft">
        {orders.length === 0
          ? "You have not placed an order yet."
          : `${orders.length} ${orders.length === 1 ? "order" : "orders"} so far.`}
      </p>

      {orders.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-line bg-subtle px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-ink-muted">
            <BagIcon className="size-7" />
          </span>
          <p className="text-[17px] font-medium">Nothing here yet</p>
          <p className="max-w-sm text-[14px] text-ink-muted">
            Every order you place shows up here with its status. Ordered as a guest
            before signing up? Look it up with your order number and phone.
          </p>
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
            <ButtonLink href="/collections">Start shopping</ButtonLink>
            <ButtonLink href="/track" variant="secondary">
              Track an order
            </ButtonLink>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-5 space-y-3">
            {orders.map((o) => (
              <li
                key={o.orderNo}
                className="rounded-[var(--radius-md)] border border-line bg-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <p className="tabular text-[14px] font-semibold">{o.orderNo}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      {formatOrderDate(o.placedAt)} ·{" "}
                      {o.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
                      STATUS_CHIP[ORDER_STATUS[o.status].tone],
                    )}
                  >
                    {ORDER_STATUS[o.status].label}
                  </span>
                </div>

                <ul className="divide-y divide-line px-4">
                  {o.items.map((line, i) => (
                    <li
                      key={`${line.slug}-${line.size ?? ""}-${i}`}
                      className="flex items-center gap-3 py-3"
                    >
                      <Link
                        href={`/products/${line.slug}`}
                        className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-subtle"
                      >
                        {line.imageUrl ? (
                          <Image
                            src={line.imageUrl}
                            alt=""
                            fill
                            sizes="56px"
                            quality={60}
                            className="object-cover"
                          />
                        ) : null}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${line.slug}`}
                          className="line-clamp-2 text-[13px] leading-snug hover:text-brand"
                        >
                          {line.name}
                        </Link>
                        <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                          {line.size ? `Size ${line.size} · ` : ""}Qty {line.qty}
                        </p>
                      </div>
                      <Taka
                        amount={line.unitPrice * line.qty}
                        className="shrink-0 text-[13px] font-semibold"
                      />
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
                  <p className="text-[13px] text-ink-soft">
                    Pay on delivery{" "}
                    <Taka amount={o.total} className="text-[15px] font-semibold text-ink" />
                  </p>
                  <Link
                    href={`/order/${o.orderNo}`}
                    className="group inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                  >
                    View details
                    <ChevronRightIcon className="size-3.5 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-5 flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] bg-subtle px-3.5 py-3 text-[13px] text-ink-soft">
            <PhoneIcon className="size-4 shrink-0 text-ink-muted" />
            <span>
              Something not right? Call{" "}
              <a
                href={`tel:${site.phone}`}
                className="tabular font-medium text-brand underline underline-offset-2"
              >
                {site.phoneDisplay}
              </a>{" "}
              and we will look it up.
            </span>
          </p>
        </>
      )}
    </div>
  );
}
