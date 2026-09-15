"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { Taka } from "@/components/ui/price";
import { PriceTag } from "./price-tag";
import { BagIcon, CheckIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Product } from "@/types/catalog";

/**
 * Buy box: variant choice, quantity, and the two actions.
 *
 * Size is required when a product has sizes and there is no default — picking
 * one for the shopper is how you turn a sale into a return, and on cash on
 * delivery a return is a round trip you paid for twice. The requirement is
 * enforced on submit, with the error tied to the field by `aria-describedby`
 * and focus moved to the size group rather than left where it was.
 */
export function ProductPurchase({ product }: { product: Product }) {
  const { add, openDrawer } = useCart();
  const router = useRouter();

  const [size, setSize] = useState<string | undefined>();
  const [color, setColor] = useState<string | undefined>(product.colors?.[0]);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const sizeGroupRef = useRef<HTMLDivElement>(null);
  const needsSize = Boolean(product.sizes?.length);

  function validate() {
    if (needsSize && !size) {
      setError("Please choose a size first.");
      sizeGroupRef.current?.focus();
      return false;
    }
    setError(null);
    return true;
  }

  function addToBag() {
    if (!validate()) return;
    add(product, size, qty, color);
    setAdded(true);
    openDrawer();
    window.setTimeout(() => setAdded(false), 2000);
  }

  function buyNow() {
    if (!validate()) return;
    add(product, size, qty, color);
    router.push("/checkout");
  }

  const disabled = !product.inStock;

  return (
    <div>
      <PriceTag
        price={product.price}
        compareAtPrice={product.compareAtPrice}
        size="lg"
      />

      {/* --- Colour ---------------------------------------------------------- */}
      {product.colors?.length ? (
        <fieldset className="mt-6">
          <legend className="text-[13px] font-medium">
            Colour: <span className="text-ink-muted">{color}</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={c === color}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border px-3.5 text-[13px] font-medium transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] active:scale-[0.97]",
                  c === color
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-surface text-ink hover:border-ink",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {/* --- Size ------------------------------------------------------------ */}
      {needsSize ? (
        <fieldset className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <legend className="text-[13px] font-medium">
              Size{size ? <span className="text-ink-muted">: {size}</span> : null}
            </legend>
            <a
              href="/size-guide"
              /*
                A standalone control, so it gets a standalone target.
                `min-h-6` sat it exactly on the 24px WCAG floor with nothing
                to spare; the height comes from padding so the underline still
                hugs the words rather than floating away from them.
              */
              className="-my-2 inline-flex min-h-11 items-center py-2 text-[12px] font-medium text-brand underline underline-offset-2"
            >
              Size guide
            </a>
          </div>

          <div
            ref={sizeGroupRef}
            tabIndex={-1}
            aria-describedby={error ? "size-error" : undefined}
            aria-invalid={error ? true : undefined}
            className="mt-2 flex flex-wrap gap-2 outline-none"
          >
            {product.sizes?.map((s) => {
              /**
               * Stock is per size, so a sold-out size is shown and disabled
               * rather than hidden. Removing it would leave the customer
               * wondering whether the shop stocks their size at all, and the
               * server would refuse the order anyway — better to say so here
               * than after they have filled in their address.
               */
              const stock = product.variants.find((v) => v.size === s)?.stock ?? 0;
              const soldOut = stock <= 0;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    setSize(s);
                    setError(null);
                  }}
                  aria-pressed={s === size}
                  aria-label={soldOut ? `Size ${s}, sold out` : `Size ${s}`}
                  className={cn(
                    "inline-flex h-11 min-w-[56px] items-center justify-center rounded-[var(--radius-sm)] border px-3 text-sm font-medium transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] active:scale-[0.95]",
                    soldOut
                      ? "cursor-not-allowed border-line bg-subtle text-ink-muted line-through decoration-ink-muted/60"
                      : s === size
                        ? "border-ink bg-ink text-white"
                        : "border-line-strong bg-surface text-ink hover:border-ink",
                    error && !size && !soldOut && "border-sale",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {error ? (
            <p id="size-error" role="alert" className="mt-2 text-[13px] text-sale">
              {error}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {/* --- Quantity -------------------------------------------------------- */}
      {/*
        Label beside the control, not above it.

        This was a titled section of its own, a full row wide, sitting between
        the size a shopper had just chosen and the button they were reaching
        for. Almost every order on a shop like this is a single item, so for
        almost everybody it was a step that existed only to be scrolled past.
        It is still here and still a 44px target — just no longer in the way.
      */}
      <div className="mt-5 flex items-center gap-3">
        <p className="text-[13px] font-medium">Quantity</p>
        <div className="inline-flex items-center rounded-[var(--radius-sm)] border border-line-strong">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            disabled={qty <= 1}
            className="inline-flex size-11 items-center justify-center text-ink-soft transition-colors duration-[var(--dur-base)] hover:bg-muted hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <MinusIcon className="size-4" />
          </button>
          <span className="tabular w-10 text-center text-sm font-medium" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(10, q + 1))}
            aria-label="Increase quantity"
            disabled={qty >= 10}
            className="inline-flex size-11 items-center justify-center text-ink-soft transition-colors duration-[var(--dur-base)] hover:bg-muted hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* --- Actions (inline; the phone also gets a sticky copy below) -------- */}
      {/*
        `flex-1` is scoped to `sm` deliberately. In the column layout below that
        breakpoint, flex-1 resolves against the *main* axis — height — setting
        `flex-basis: 0%` and overriding `h-[52px]`, which collapsed both CTAs to
        about 23px. Row layout is the only place it should apply.
      */}
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={addToBag}
          disabled={disabled}
          className={cn(
            "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border text-[15px] font-medium sm:w-auto sm:flex-1 transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
            added
              ? "border-brand bg-brand-tint text-brand"
              : "border-ink bg-surface text-ink hover:bg-ink hover:text-white",
          )}
        >
          {added ? <CheckIcon className="size-[18px]" /> : <BagIcon className="size-[18px]" />}
          {added ? "Added to bag" : "Add to bag"}
        </button>

        <button
          type="button"
          onClick={buyNow}
          disabled={disabled}
          className="inline-flex h-[52px] w-full items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[15px] font-medium text-white sm:w-auto sm:flex-1 transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          Order now
        </button>
      </div>

      {disabled ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          This item is out of stock. Call us and we will tell you when it is back.
        </p>
      ) : null}

      {/*
        Sticky buy bar for phones. It sits directly above the tab bar rather
        than replacing it — on a long product page the action has to stay
        within thumb reach without costing the shopper their way back out.
      */}
      {!disabled ? (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-[var(--z-sticky)] flex items-center gap-3 border-t border-line bg-canvas/95 px-4 py-2.5 backdrop-blur-sm lg:hidden">
          <div className="min-w-0">
            <Taka amount={product.price * qty} className="text-base font-semibold" />
            {size ? (
              <p className="text-[11px] text-ink-muted">Size {size}</p>
            ) : needsSize ? (
              <p className="text-[11px] text-ink-muted">Choose a size</p>
            ) : null}
          </div>
          {/*
            Ordering, not bagging.

            This bar is the only control on screen for most of the page, and it
            used to offer the weaker of the two actions. On a cash-on-delivery
            shop there is no basket-building to protect: nothing is paid for
            here, the order is confirmed by telephone afterwards, and most
            arrivals came from an advertisement for this one item. Sending them
            to the bag adds a screen between them and the thing they came to
            do.

            Add-to-bag keeps its place beside it, as an icon, for the shopper
            who is genuinely buying more than one thing.
          */}
          <button
            type="button"
            onClick={addToBag}
            aria-label={added ? "Added to bag" : "Add to bag"}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] active:scale-[0.95]",
              added ? "border-brand bg-brand-tint text-brand" : "border-line-strong text-ink",
            )}
          >
            {added ? <CheckIcon className="size-[18px]" /> : <BagIcon className="size-[18px]" />}
          </button>

          <button
            type="button"
            onClick={buyNow}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[14px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] active:scale-[0.98]"
          >
            Order now
          </button>
        </div>
      ) : null}
    </div>
  );
}
