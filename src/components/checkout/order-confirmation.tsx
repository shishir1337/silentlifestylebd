"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Taka } from "@/components/ui/price";
import { ButtonLink } from "@/components/ui/button";
import { CashIcon, CheckIcon, PhoneIcon, TruckIcon } from "@/components/ui/icons";
import { formatOrderDate, getOrder, type Order } from "@/lib/orders";
import { delivery, site } from "@/data/site";

/**
 * Order confirmation.
 *
 * Reads the order the checkout just wrote. This is the moment a cash-on-
 * delivery customer decides whether the shop is real, so it states plainly
 * what happens next, what they will pay, and how to reach a human — rather
 * than a bare "thank you for your order".
 */
export function OrderConfirmation({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | undefined>();
  const [ready, setReady] = useState(false);

  // localStorage exists only in the browser; reading during render would
  // hydrate a different tree than the server sent.
  useEffect(() => {
    setOrder(getOrder(id));
    setReady(true);
  }, [id]);

  if (!ready) return <div className="py-24" aria-busy="true" />;

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-[17px] font-medium">We can&apos;t find that order</p>
        <p className="max-w-md text-[14px] text-ink-muted">
          Order <span className="tabular font-medium">{id}</span> isn&apos;t on this
          device. It may have been placed in another browser — call us and we will
          look it up for you.
        </p>
        <a
          href={`tel:${site.phone}`}
          className="mt-2 inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-ink px-5 text-sm font-medium text-white"
        >
          <PhoneIcon className="size-4" />
          <span className="tabular">{site.phoneDisplay}</span>
        </a>
      </div>
    );
  }

  const eta =
    order.area === "inside-dhaka" ? delivery.insideDhakaDays : delivery.outsideDhakaDays;

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
          Thank you, {order.customer.name.split(" ")[0]}. We will call{" "}
          <span className="tabular">{order.customer.phone}</span> to confirm before
          dispatch.
        </p>

        <p className="mt-4 rounded-[var(--radius-sm)] border border-line bg-subtle px-4 py-2.5 text-[13px]">
          Order number{" "}
          <span className="tabular font-semibold tracking-wide">{order.id}</span>
        </p>
        <p className="mt-2 text-[12px] text-ink-muted">
          Placed on {formatOrderDate(order.placedAt)}
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
              {order.customer.name}
              <br />
              <span className="tabular">{order.customer.phone}</span>
              {order.customer.altPhone ? (
                <>
                  {" · "}
                  <span className="tabular">{order.customer.altPhone}</span>
                </>
              ) : null}
              <br />
              {order.customer.address}
            </p>
            {order.customer.note ? (
              <p className="mt-2 text-[12px] text-ink-muted">
                Note: {order.customer.note}
              </p>
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
              {order.lines.map((line) => (
                <li key={line.key} className="flex gap-3 py-3">
                  <Link
                    href={`/products/${line.slug}`}
                    className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-canvas"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="56px"
                      quality={60}
                      className="object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] leading-snug">{line.name}</p>
                    <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                      {line.size ? `Size ${line.size} · ` : ""}Qty {line.qty}
                    </p>
                  </div>
                  <Taka amount={line.price * line.qty} className="text-[13px] font-semibold" />
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd><Taka amount={order.subtotal} className="font-medium" /></dd>
              </div>
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
                <dd><Taka amount={order.total} className="text-xl font-semibold" /></dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
