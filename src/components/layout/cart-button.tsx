"use client";

import { useCart } from "@/lib/cart";
import { BagIcon } from "@/components/ui/icons";

/**
 * Header bag. Opens the drawer rather than navigating: checking the bag should
 * not cost the shopper the scroll position they were browsing at.
 *
 * The badge renders only once the cart has been read from localStorage — the
 * server cannot know it, so painting a number before then would hydrate a
 * different tree than the one that was sent.
 */
export function CartButton() {
  const { count, ready, openDrawer } = useCart();
  const show = ready && count > 0;

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`Open bag, ${ready ? count : 0} ${count === 1 ? "item" : "items"}`}
      aria-haspopup="dialog"
      className="relative -mr-2 inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--dur-base)] hover:bg-muted"
    >
      <BagIcon className="size-[21px]" />
      {show ? (
        <span className="tabular absolute top-1.5 right-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-sale px-1 text-[10px] leading-[18px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}
