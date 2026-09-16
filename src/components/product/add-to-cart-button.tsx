"use client";

import { useEffect, useState } from "react";
import { useOverlay } from "@/lib/use-overlay";
import { useCart } from "@/lib/cart";
import { BagIcon, CheckIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Product } from "@/types/catalog";

/**
 * Card-level add to bag.
 *
 * A shirt in four sizes cannot honestly be added from a grid tile, so anything
 * with variants opens a size sheet first rather than silently picking one for
 * the shopper — a wrong size is a return, and returns are what kill margin on
 * cash-on-delivery orders. Products without variants add in a single tap.
 */
export function AddToCartButton({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const needsSize = Boolean(product.sizes?.length);

  // Mounted only while in use — with ~20 cards on the homepage, keeping every
  // dialog in the DOM shipped a few hundred nodes nobody asked for.
  const { mounted, ref: attach, node } = useOverlay(sheetOpen);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the ref is null until the dialog mounts, so `mounted` is what makes this run at the moment there is a node to listen to.
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const onClose = () => setSheetOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [mounted, node]);

  // Revert the confirmation without leaving a timer behind on unmount.
  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(id);
  }, [added]);

  function confirm(size?: string) {
    add(product, size);
    setSheetOpen(false);
    setAdded(true);
  }

  if (!product.inStock) {
    return (
      <button
        type="button"
        disabled
        className="relative z-10 mt-2.5 inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-sm)] border border-line bg-muted text-[13px] font-medium text-ink-muted"
      >
        Out of stock
      </button>
    );
  }

  return (
    <>
      {/*
        `relative z-10` matters: the card's title link is stretched across the
        whole tile with an ::after overlay, and without its own stacking this
        button would sit underneath it and never receive the tap.
      */}
      <button
        type="button"
        onClick={() => (needsSize ? setSheetOpen(true) : confirm())}
        aria-haspopup={needsSize ? "dialog" : undefined}
        aria-label={
          needsSize ? `Choose a size for ${product.name}` : `Add ${product.name} to bag`
        }
        className={cn(
          "relative z-10 mt-2.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border text-[13px] font-medium transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] [transition-timing-function:var(--ease-out-soft)] active:scale-[0.97] active:duration-[var(--dur-fast)]",
          added
            ? "border-brand bg-brand-tint text-brand"
            : "border-line-strong bg-surface text-ink hover:border-ink hover:bg-ink hover:text-white",
        )}
      >
        {added ? (
          <>
            <CheckIcon className="size-4" />
            Added
          </>
        ) : (
          <>
            <BagIcon className="size-4" />
            {needsSize ? "Select size" : "Add to bag"}
          </>
        )}
      </button>

      {needsSize && mounted ? (
        <dialog
          ref={attach}
          onClick={(e) => {
            if (e.target === node.current) setSheetOpen(false);
          }}
          aria-label={`Choose a size for ${product.name}`}
          /*
            Positioned explicitly at both breakpoints. The UA stylesheet centres
            a dialog with `margin: auto` against `inset: 0`; overriding only
            part of that (`m-0 mt-auto`) leaves the box over-constrained, which
            is what was clipping this sheet at the bottom edge on phone *and*
            desktop. Bottom sheet under `sm`, centred modal above it, with a
            capped height and internal scroll so a long size list can never
            push the panel off-screen.
          */
          className={cn(
            "overlay overlay-sheet fixed inset-x-0 bottom-0 top-auto z-[var(--z-drawer)] m-0 flex max-h-[80dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[var(--radius-lg)] bg-canvas p-0 text-ink",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85dvh] sm:w-[min(420px,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-lg)] sm:shadow-[var(--shadow-pop)]",
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
                Select size
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">{product.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close"
              className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-muted"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {product.sizes?.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => confirm(size)}
                  className="inline-flex h-11 min-w-[56px] items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-sm font-medium transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] [transition-timing-function:var(--ease-out-soft)] hover:border-ink hover:bg-ink hover:text-white active:scale-[0.95]"
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Safe-area padding lives on its own row so it can never eat into
              the scroll region above it. */}
          <div className="h-2 shrink-0 safe-bottom" />
        </dialog>
      ) : null}
    </>
  );
}
