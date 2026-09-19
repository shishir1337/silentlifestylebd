"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useOverlay } from "@/lib/use-overlay";
import { useCart } from "@/lib/cart";
import { Taka } from "@/components/ui/price";
import { PriceTag } from "./price-tag";
import { fillProps } from "@/lib/image";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { isVideo, type Product } from "@/types/catalog";
import { cn } from "@/lib/cn";

/**
 * The product, without leaving the grid.
 *
 * ## The bug this replaces
 *
 * The card used to open a sheet of sizes and nothing else, and then called
 * `add(product, size)` — with no colour. Six of the products in this catalogue
 * are sold in both, so a shopper could add a shirt from the homepage and the
 * picking slip would say a size and no colour at all. Nobody finds that out
 * until a parcel is packed wrong.
 *
 * Adding a colour row to a size sheet would have fixed the data and left the
 * real problem: a tile is a photograph, a name and a price, and it was asking
 * people to commit to a garment on that. This shows them the thing.
 *
 * ## What it is, and what it is not
 *
 * Everything needed to decide and nothing more — the photographs, the price,
 * the colours, the sizes with the sold-out ones struck through, a quantity,
 * and the first few lines of the description. It is not a second product page:
 * no tabs, no size chart, no related rail. The link at the bottom goes to the
 * real one, and it is the right answer for anybody who wants more than this.
 *
 * ## Mounted only while open
 *
 * A category page carries twenty-four of these. Keeping them in the DOM would
 * ship twenty-four galleries nobody opened, so `useOverlay` mounts on demand
 * and unmounts after the closing transition has actually run.
 */
export function QuickView({
  product,
  open,
  onClose,
  onAdded,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { add, openDrawer } = useCart();
  const { mounted, ref: attach, node } = useOverlay(open);

  const [size, setSize] = useState<string | undefined>();
  const [color, setColor] = useState<string | undefined>(product.colors?.[0]);
  const [qty, setQty] = useState(1);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const needsSize = Boolean(product.sizes?.length);
  /* Videos are a product-page thing: they need a click to play and there is no
     room here for controls. The stills are what a decision is made on. */
  const photos = [product.image, product.hoverImage, ...(product.gallery ?? [])]
    .filter((img): img is NonNullable<typeof img> => Boolean(img) && !isVideo(img!))
    .slice(0, 4);

  // The browser closes a <dialog> on Escape and on a backdrop dismissal; React
  // has to be told, or `open` and the element disagree on the next render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the ref is null until the dialog mounts, so `mounted` is what makes this run at the moment there is a node to listen to.
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [mounted, node, onClose]);

  // A second opening starts from the top, not from wherever the last one left
  // the selection — this is a different decision about the same product.
  useEffect(() => {
    if (!open) return;
    setSize(undefined);
    setColor(product.colors?.[0]);
    setQty(1);
    setShown(0);
    setError(null);
  }, [open, product.colors]);

  if (!mounted) return null;

  function addToBag() {
    if (needsSize && !size) {
      setError("Choose a size first.");
      return;
    }
    add(product, size, qty, color);
    onAdded();
    onClose();
    openDrawer();
  }

  return (
    <dialog
      ref={attach}
      onClick={(e) => {
        if (e.target === node.current) onClose();
      }}
      aria-label={`${product.name} — quick view`}
      /*
        Positioned explicitly at both breakpoints. The user agent centres a
        dialog with `margin: auto` against `inset: 0`; overriding half of that
        leaves the box over-constrained, which is what clipped the old size
        sheet at the bottom edge. Bottom sheet under `sm`, centred panel above
        it, capped height with the body scrolling inside so a long size list
        can never push the button off screen.
      */
      className={cn(
        "overlay overlay-sheet fixed inset-x-0 bottom-0 top-auto z-[var(--z-drawer)] m-0 flex max-h-[88dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[var(--radius-lg)] bg-canvas p-0 text-ink",
        "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85dvh] sm:w-[min(760px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-lg)] sm:shadow-[var(--shadow-pop)]",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
          Quick view
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--dur-base)] hover:bg-muted"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-5 sm:p-4">
          {/* --- pictures ------------------------------------------------- */}
          <div className="sm:min-w-0">
            <div className="relative aspect-4/5 w-full overflow-hidden bg-subtle sm:rounded-[var(--radius-md)]">
              <Image
                {...fillProps(photos[shown] ?? product.image)}
                alt={product.name}
                sizes="(min-width:640px) 370px, 100vw"
                quality={75}
                className="object-cover"
              />
              {!product.inStock ? (
                <span className="absolute inset-0 flex items-center justify-center bg-canvas/75 text-[13px] font-semibold">
                  Out of stock
                </span>
              ) : null}
            </div>

            {photos.length > 1 ? (
              <ul className="mt-2 flex gap-2 px-4 sm:px-0">
                {photos.map((img, i) => (
                  <li key={img.url}>
                    <button
                      type="button"
                      onClick={() => setShown(i)}
                      aria-label={`Picture ${i + 1} of ${photos.length}`}
                      aria-current={i === shown ? "true" : undefined}
                      className={cn(
                        "relative block size-14 overflow-hidden rounded-[var(--radius-sm)] border-2",
                        i === shown ? "border-ink" : "border-transparent",
                      )}
                    >
                      <Image
                        {...fillProps(img)}
                        alt=""
                        sizes="56px"
                        quality={60}
                        className="object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* --- the decision --------------------------------------------- */}
          <div className="px-4 pt-4 sm:min-w-0 sm:px-0 sm:pt-0">
            <h2 className="text-[17px] leading-snug font-semibold">{product.name}</h2>
            <div className="mt-1.5">
              <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
            </div>

            {product.description ? (
              <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-ink-soft">
                {product.description}
              </p>
            ) : null}

            {/*
              Colour, which is the whole reason this replaced a size sheet.
              It reaches `add()` now, so it reaches the order and the picking
              slip.
            */}
            {product.colors?.length ? (
              <fieldset className="mt-4">
                <legend className="text-[12.5px] font-medium">
                  Colour: <span className="text-ink-muted">{color}</span>
                </legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-pressed={c === color}
                      className={cn(
                        "inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border px-3 text-[12.5px] font-medium transition-[background-color,border-color,color] duration-[var(--dur-base)]",
                        c === color
                          ? "border-ink bg-ink text-white"
                          : "border-line-strong bg-surface hover:border-ink",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {needsSize ? (
              <fieldset className="mt-4">
                <legend className="text-[12.5px] font-medium">
                  Size{size ? <span className="text-ink-muted">: {size}</span> : null}
                </legend>
                <div
                  aria-describedby={error ? "qv-size-error" : undefined}
                  className="mt-1.5 flex flex-wrap gap-2"
                >
                  {product.sizes?.map((s) => {
                    // Per-size stock, so a sold-out size is shown struck
                    // through rather than hidden — removing it leaves a
                    // shopper wondering whether the shop stocks it at all.
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
                          "inline-flex h-10 min-w-[52px] items-center justify-center rounded-[var(--radius-sm)] border px-3 text-[13px] font-medium transition-[background-color,border-color,color] duration-[var(--dur-base)]",
                          soldOut
                            ? "cursor-not-allowed border-line bg-subtle text-ink-muted line-through decoration-ink-muted/60"
                            : s === size
                              ? "border-ink bg-ink text-white"
                              : "border-line-strong bg-surface hover:border-ink",
                          error && !size && !soldOut && "border-sale",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {error ? (
                  <p id="qv-size-error" role="alert" className="mt-1.5 text-[12.5px] text-sale">
                    {error}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <p className="text-[12.5px] font-medium">Quantity</p>
              <div className="inline-flex items-center rounded-[var(--radius-sm)] border border-line-strong">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  className="inline-flex size-10 items-center justify-center text-ink-soft hover:bg-muted hover:text-ink disabled:opacity-40"
                >
                  <MinusIcon className="size-4" />
                </button>
                <span className="tabular w-9 text-center text-[13px] font-medium" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  disabled={qty >= 10}
                  aria-label="Increase quantity"
                  className="inline-flex size-10 items-center justify-center text-ink-soft hover:bg-muted hover:text-ink disabled:opacity-40"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
            </div>

            <Link
              href={`/products/${product.slug}`}
              onClick={onClose}
              className="mt-4 inline-flex min-h-11 items-center text-[12.5px] font-medium text-brand underline underline-offset-2"
            >
              Full details, size chart and delivery
            </Link>
          </div>
        </div>
      </div>

      {/* Its own row, outside the scroller, so the action is always reachable
          however long the size list runs. */}
      <div className="shrink-0 border-t border-line px-4 pt-3 pb-4 safe-bottom">
        <button
          type="button"
          onClick={addToBag}
          disabled={!product.inStock}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-ink text-[15px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
        >
          {product.inStock ? (
            <>
              Add to bag · <Taka amount={product.price * qty} />
            </>
          ) : (
            "Out of stock"
          )}
        </button>
      </div>
    </dialog>
  );
}
