import Image from "next/image";
import Link from "next/link";
import { Taka } from "@/components/ui/price";
import { ButtonLink } from "@/components/ui/button";
import { CashIcon, CheckIcon, PhoneIcon, TruckIcon } from "@/components/ui/icons";
import { formatOrderDate } from "@/lib/orders";
import { ORDER_STATUS, STATUS_CHIP } from "@/lib/order-status";
import type { OrderView } from "@/lib/order-reads";
import { TrackPurchase } from "./track-purchase";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * Order confirmation.
 *
 * A Server Component now: the order is a row in Postgres, and the page that
 * renders this has already established that the person asking is entitled to
 * see it. It used to read `localStorage`, which meant the shop never knew an
 * order existed and the customer lost it by clearing their browser.
 *
 * This is the moment a cash-on-delivery customer decides whether the shop is
 * real, so it states plainly what happens next, what they will pay, and how to
 * reach a human — rather than a bare "thank you for your order".
 */
export async function OrderConfirmation({ order }: { order: OrderView }) {
  const site = await getSiteSettings();
  const { delivery } = site;
  const eta =
    order.area === "inside-dhaka" ? delivery.insideDhakaDays : delivery.outsideDhakaDays;
  const status = ORDER_STATUS[order.status];

  return (
    <div className="pb-10">
      <div className="flex flex-col items-center py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand text-on-brand">
          <CheckIcon className="size-7" />
        </span>
        <h1 className="mt-4 text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
          Order placed
        </h1>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-soft">
          Thank you, {order.customerName.split(" ")[0]}. We will call{" "}
          <span className="tabular">{order.customerPhone}</span> to confirm before
          dispatch.
        </p>

        <p className="mt-4 rounded-[var(--radius-sm)] border border-line bg-subtle px-4 py-2.5 text-[13px]">
          Order number{" "}
          <span className="tabular font-semibold tracking-wide">{order.orderNo}</span>
        </p>
        <p className="mt-2 text-[12px] text-ink-muted">
          Placed on {formatOrderDate(order.placedAt)}
        </p>

        {/*
          Shown even on a freshly placed order. The status is real now — staff
          move it in the admin panel — so this page is worth returning to, and
          it should say so from the first visit rather than only after it
          changes.
        */}
        <p
          className={cn(
            "mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase",
            STATUS_CHIP[status.tone],
          )}
        >
          {status.label}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <section aria-labelledby="next" className="order-2 lg:order-1">
          <h2 id="next" className="text-[17px] font-semibold">
            What happens next
          </h2>
          <ol className="mt-4 space-y-4">
            {[
              {
                Icon: PhoneIcon,
                title: "We call to confirm",
                body: "Usually within a few hours, to check your size and address.",
              },
              {
                Icon: TruckIcon,
                title: `Delivery in ${eta}`,
                body: "You can check the parcel at your door before paying.",
              },
              {
                Icon: CashIcon,
                title: "Pay on delivery",
                body: (
                  <>
                    Keep <Taka amount={order.total} className="font-semibold" /> ready
                    in cash. Pay only if you keep the parcel.
                  </>
                ),
              },
            ].map(({ Icon, title, body }, i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">
                    <span className="tabular text-ink-muted">{i + 1}.</span> {title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-7 rounded-[var(--radius-md)] border border-line p-4">
            <h3 className="text-[13px] font-semibold">Delivering to</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              {order.customerName}
              <br />
              <span className="tabular">{order.customerPhone}</span>
              {order.altPhone ? (
                <>
                  {" · "}
                  <span className="tabular">{order.altPhone}</span>
                </>
              ) : null}
              <br />
              {order.address}
            </p>
            {order.note ? (
              <p className="mt-2 text-[12px] text-ink-muted">Note: {order.note}</p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <ButtonLink href="/collections" variant="secondary" className="sm:flex-1">
              Continue shopping
            </ButtonLink>
            <ButtonLink href={`tel:${site.phone}`} className="sm:flex-1">
              <PhoneIcon className="size-4" />
              Call us
            </ButtonLink>
          </div>
        </section>

        <aside aria-labelledby="ordered" className="order-1 lg:order-2">
          <div className="rounded-[var(--radius-md)] border border-line bg-subtle p-4">
            <h2 id="ordered" className="text-[15px] font-semibold">
              Order summary
            </h2>

            <ul className="mt-3 divide-y divide-line">
              {order.items.map((line, i) => (
                <li key={`${line.slug}-${line.size ?? ""}-${i}`} className="flex gap-3 py-3">
                  <Link
                    href={`/products/${line.slug}`}
                    className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-canvas"
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
                    <p className="line-clamp-2 text-[13px] leading-snug">{line.name}</p>
                    <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                      {[line.color, line.size && `Size ${line.size}`, `Qty ${line.qty}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {/*
                    The price stored on the line, not today's. An order is a
                    record of what was agreed, and it must not change because
                    the shop later changed a price.
                  */}
                  <Taka
                    amount={line.unitPrice * line.qty}
                    className="text-[13px] font-semibold"
                  />
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>
                  <Taka amount={order.subtotal} className="font-medium" />
                </dd>
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
                <dt className="text-ink-soft">
                  Delivery ·{" "}
                  {order.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                </dt>
                <dd>
                  {order.deliveryCharge === 0 ? (
                    <span className="font-medium text-brand">Free</span>
                  ) : (
                    <Taka amount={order.deliveryCharge} className="font-medium" />
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                <dt className="text-[15px] font-semibold">Pay on delivery</dt>
                <dd>
                  <Taka amount={order.total} className="text-xl font-semibold" />
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {/*
        The sale, reported to whatever the shop has configured.

        `order.total` rather than the subtotal: it is the number on the
        customer’s invoice and the one the shop can reconcile against its own
        books later. Delivery is in it because the customer pays it.

        Older orders have no SKU — the column did not exist when they were
        placed — so those fall back to the slug. It will not match a catalogue
        feed, which is the honest outcome: there is no way to know now what
        stock code that line was sold under.
      */}
      <TrackPurchase
        orderNo={order.orderNo}
        value={order.total}
        items={order.items.map((i) => ({
          sku: i.sku ?? i.slug,
          name: i.name,
          price: i.unitPrice,
          quantity: i.qty,
        }))}
      />
    </div>
  );
}
