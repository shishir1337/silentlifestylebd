"use client";

import { usePathname } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";

/**
 * The phone's search row — everywhere except a product page.
 *
 * It is a persistent row rather than an icon because search is the second
 * strongest intent on this shop and hiding it behind a tap costs more than the
 * 44px it takes. That reasoning holds for somebody browsing. It inverts for
 * somebody who arrived on a product page from an advertisement.
 *
 * Most of this shop's traffic lands on a product page directly, and on a
 * 390×844 phone the fixed chrome already eats a third of the screen: header
 * and search 116px, the buy bar 76px, the tab bar 80px. The measured cost was
 * that the product's own name sat at 730px — below the fold, behind the buy
 * bar — on the one page where the name, the price and "cash on delivery" are
 * the entire pitch. Sixty pixels of search field are not worth that.
 *
 * Only on phones. At `lg` the search sits inside the header row where it costs
 * nothing, and it stays there on every page.
 *
 * A client island rather than a prop threaded down from each page: the header
 * lives in the root layout, above the pages, so there is nothing to thread it
 * from. This reads the path it is already rendering under.
 */
export function MobileHeaderSearch() {
  const pathname = usePathname();
  if (pathname.startsWith("/products/")) return null;

  return (
    <form action="/search" role="search" className="pb-2.5 lg:hidden">
      <label htmlFor="search-mobile" className="sr-only">
        Search products
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-muted" />
        <input
          id="search-mobile"
          name="q"
          type="search"
          enterKeyHint="search"
          placeholder="Search for panjabi, shirts, watches…"
          /* 16px min: anything smaller makes iOS Safari zoom on focus. */
          className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-subtle pr-3 pl-10 text-base placeholder:text-ink-muted focus:border-brand focus:bg-canvas"
        />
      </div>
    </form>
  );
}
