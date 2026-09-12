"use client";

import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SORT_OPTIONS, isSortValue, type SortValue } from "@/data/collections";

/**
 * Toolbar + grid for a collection.
 *
 * Two constraints pull against each other here:
 *
 *  - The page must stay static. Reading `searchParams` on the server turns all
 *    18 collection routes into on-demand renders, which is the wrong trade for
 *    a storefront that should sit on a CDN.
 *  - The products must be in the prerendered HTML. Reading `useSearchParams()`
 *    inside a Suspense boundary would prerender the *fallback* instead, so the
 *    grid would be missing from the HTML a crawler sees.
 *
 * So the cards arrive as already-rendered children from the Server Component —
 * `ProductCard` is never serialised into the client bundle — and this component
 * only reorders them. The sort is read from the URL after mount and written
 * back on change, so a `?sort=` link is still shareable and survives a refresh.
 */
export function CollectionResults({
  action,
  children,
}: {
  /** The collection's own path, used when writing `?sort=` back to the URL. */
  action: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortValue>("featured");

  // After mount, not during render: the server has no URL search to read, and
  // seeding state from one would hydrate a different tree than it sent.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("sort");
    if (isSortValue(fromUrl ?? undefined)) setSort(fromUrl as SortValue);
  }, []);

  const items = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);

  const ordered = useMemo(() => {
    const read = (el: (typeof items)[number], key: string): number => {
      const props = el.props as Record<string, unknown>;
      return Number(props[key] ?? 0);
    };
    const copy = [...items];
    switch (sort) {
      case "price-asc":
        return copy.sort((a, b) => read(a, "data-price") - read(b, "data-price"));
      case "price-desc":
        return copy.sort((a, b) => read(b, "data-price") - read(a, "data-price"));
      case "discount":
        return copy.sort((a, b) => read(b, "data-discount") - read(a, "data-discount"));
      default:
        return copy.sort((a, b) => read(b, "data-instock") - read(a, "data-instock"));
    }
  }, [items, sort]);

  function change(value: string) {
    if (!isSortValue(value)) return;
    setSort(value);
    // `replace`, not `push`: choosing a sort should not add a history entry the
    // back button has to walk through on the way out of the collection.
    router.replace(value === "featured" ? action : `${action}?sort=${value}`, {
      scroll: false,
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-line py-3">
        <p className="tabular text-[13px] text-ink-muted">
          {items.length} {items.length === 1 ? "product" : "products"}
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="shrink-0 text-[13px] text-ink-muted">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            value={sort}
            onChange={(e) => change(e.currentTarget.value)}
            /* 16px min on phones: anything smaller makes iOS Safari zoom on focus. */
            className="h-10 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 text-[16px] focus:border-brand focus:outline-none sm:text-[13px]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/*
        The grid needs a heading of its own. Product cards title themselves with
        <h3>, and on this route the nearest ancestor heading is the collection's
        <h1> — so without this the outline jumps h1 -> h3. It carries no visual
        weight, only structure.
      */}
      <h2 className="sr-only">Products in this collection</h2>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-7 py-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-9 lg:grid-cols-4">
        {ordered}
      </ul>
    </>
  );
}
