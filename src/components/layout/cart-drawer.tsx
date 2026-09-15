"use client";

import { useEffect } from "react";
import { useOverlay } from "@/lib/use-overlay";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { Taka } from "@/components/ui/price";
import {
  BagIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { useDelivery } from "@/lib/site-settings";
import { freeDeliveryOffered } from "@/lib/orders";
import { cn } from "@/lib/cn";

/**
 * Bag drawer.
 *
 * Opened from the header bag and the mobile tab bar, replacing navigation to a
 * /cart route: on a phone, sending a shopper to a separate page to check what
 * they picked up costs the scroll position they were browsing at, and getting
 * back to it is the friction that loses the second and third item.
 *
 * Native <dialog> for the focus trap, Escape handling and inert background —
 * but positioned explicitly rather than leaning on the UA default. The user
 * agent stylesheet centres a dialog with `margin: auto` against `inset: 0`;
 * override only part of that and the box is left over-constrained, which is
 * how a panel ends up clipped at the bottom edge.
 */
export function CartDrawer() {
  const delivery = useDelivery();
  const { lines, count, subtotal, drawerOpen, closeDrawer, remove, setQty } = useCart();
  const { mounted, ref: attach, node } = useOverlay(drawerOpen);

  // Escape and backdrop dismissal close the dialog natively; mirror that back
  // into React state so the two cannot disagree.
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const onClose = () => closeDrawer();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [mounted, closeDrawer, node]);

  if (!mounted) return null;

  /*
    Nothing to nudge towards when there is no offer. A shop that has turned
    free delivery off would otherwise show "Add ৳3,000 more for free delivery"
    against a threshold of zero, which is both untrue and unreachable.
  */
  const offering = freeDeliveryOffered(delivery);
  const remaining = delivery.freeThreshold - subtotal;
  const qualifies = remaining <= 0;

  return (
    <dialog
      ref={attach}
      onClick={(e) => {
        if (e.target === node.current) closeDrawer();
      }}
      aria-label="Shopping bag"
      className="overlay overlay-right fixed inset-y-0 right-0 left-auto m-0 flex h-dvh max-h-none w-[90vw] max-w-[420px] flex-col bg-canvas p-0 text-ink"
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="font-display text-base font-semibold tracking-tight">
          Your bag{count > 0 ? ` (${count})` : ""}
        </h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close bag"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--dur-base)] hover:bg-muted"
        >
          <CloseIcon className="size-5" />
        </button>
      </header>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-ink-muted">
            <BagIcon className="size-7" />
          </span>
          <p className="text-[15px] font-medium">Your bag is empty</p>
          <p className="text-[13px] text-ink-muted">
            Add something you like and it will show up here.
          </p>
          <button
            type="button"
            onClick={closeDrawer}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] bg-ink px-6 text-sm font-medium text-white transition-colors duration-[var(--dur-base)] hover:bg-ink/90"
          >
            Continue shopping
          </button>
        </div>
      ) : (
        <>
          {/* `min-h-0` is what actually lets this scroll: a flex child defaults
              to min-height:auto and would otherwise refuse to shrink below its
              content, pushing the footer off-screen. */}
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-4">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-3 py-4">
                <Link
                  href={`/products/${line.slug}`}
                  onClick={closeDrawer}
                  className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-subtle"
                >
                  <Image
                    src={line.image}
                    alt=""
                    fill
                    sizes="80px"
                    quality={60}
                    className="object-cover"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/products/${line.slug}`}
                    onClick={closeDrawer}
                    className="line-clamp-2 text-[13px] leading-snug text-ink-soft hover:text-ink"
                  >
                    {line.name}
                  </Link>
                  {line.size || line.color ? (
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      {[line.color, line.size && `Size ${line.size}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="inline-flex items-center rounded-[var(--radius-sm)] border border-line">
                      <button
                        type="button"
                        onClick={() => setQty(line.key, line.qty - 1)}
                        aria-label={`Decrease quantity of ${line.name}`}
                        className="inline-flex size-9 items-center justify-center text-ink-soft transition-colors duration-[var(--dur-base)] hover:bg-muted hover:text-ink"
                      >
                        <MinusIcon className="size-4" />
                      </button>
                      <span className="tabular w-7 text-center text-[13px] font-medium">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(line.key, line.qty + 1)}
                        aria-label={`Increase quantity of ${line.name}`}
                        className="inline-flex size-9 items-center justify-center text-ink-soft transition-colors duration-[var(--dur-base)] hover:bg-muted hover:text-ink"
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    </div>

                    <Taka amount={line.price * line.qty} className="text-sm font-semibold" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(line.key)}
                  aria-label={`Remove ${line.name} from bag`}
                  className="-mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center self-start rounded-[var(--radius-sm)] text-ink-muted transition-colors duration-[var(--dur-base)] hover:bg-sale-tint hover:text-sale"
                >
                  <TrashIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>

          <footer className="shrink-0 border-t border-line px-4 pt-3 pb-4 safe-bottom">
            {/* A concrete gap to the free-delivery threshold lifts basket size
                far more reliably than a generic "free delivery available". */}
            {offering ? (
            <p
              className={cn(
                "mb-3 flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[12px] font-medium",
                qualifies ? "bg-brand-tint text-brand" : "bg-subtle text-ink-soft",
              )}
            >
              <TruckIcon className="size-4 shrink-0" />
              {qualifies ? (
                <span>Your order ships free.</span>
              ) : (
                <span>
                  Add <Taka amount={remaining} className="font-semibold" /> more for free
                  delivery.
                </span>
              )}
            </p>
            ) : null}

            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-soft">Subtotal</span>
              <Taka amount={subtotal} className="text-lg font-semibold" />
            </div>

            <p className="mb-3 text-[12px] leading-relaxed text-ink-muted">
              Delivery charged at checkout — <Taka amount={delivery.insideDhaka} /> inside
              Dhaka, <Taka amount={delivery.outsideDhaka} /> outside. Cash on Delivery
              available.
            </p>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[15px] font-medium text-white transition-colors duration-[var(--dur-base)] hover:bg-ink/90"
            >
              Checkout
            </Link>
          </footer>
        </>
      )}
    </dialog>
  );
}
