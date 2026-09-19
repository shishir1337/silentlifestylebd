"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { QuickView } from "./quick-view";
import { BagIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Product } from "@/types/catalog";

/**
 * Card-level add to bag.
 *
 * A garment sold in four sizes and three colours cannot honestly be added from
 * a grid tile, so anything with a choice to make opens the quick view first
 * rather than picking for the shopper. A wrong size is a return, and on cash on
 * delivery a return is a round trip the shop paid for twice.
 *
 * This used to open a sheet of sizes only, and then call `add(product, size)`
 * with no colour at all. Six products in this catalogue are sold in both, so a
 * shirt added from the homepage reached the picking slip with a size and no
 * colour — a packing error nobody would find until the parcel was open. The
 * quick view carries the whole choice and passes all of it.
 *
 * Products with neither sizes nor colours still add in one tap, which is most
 * of the accessories.
 */
export function AddToCartButton({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [viewing, setViewing] = useState(false);

  /*
    Anything the shopper has to decide sends them to the quick view. Sizes were
    the old test; colours belong in it for exactly the same reason, and leaving
    them out is what produced the bug above.
  */
  const needsChoice = Boolean(product.sizes?.length || product.colors?.length);

  // Revert the confirmation without leaving a timer behind on unmount.
  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(id);
  }, [added]);

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
        onClick={() => {
          if (needsChoice) {
            setViewing(true);
            return;
          }
          add(product);
          setAdded(true);
        }}
        aria-haspopup={needsChoice ? "dialog" : undefined}
        aria-label={
          needsChoice
            ? `Choose options for ${product.name}`
            : `Add ${product.name} to bag`
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
            {/*
              "Choose options", not "Select size". The old label named one of
              the two things behind it, which is how a colour choice stayed
              invisible from the grid.
            */}
            {needsChoice ? "Choose options" : "Add to bag"}
          </>
        )}
      </button>

      {needsChoice ? (
        <QuickView
          product={product}
          open={viewing}
          onClose={() => setViewing(false)}
          onAdded={() => setAdded(true)}
        />
      ) : null}
    </>
  );
}
