"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * Search, chips and selects — all of it written into the URL.
 *
 * The filter state is the address. That makes a filtered view shareable
 * ("here's the list I mean"), survivable across a refresh, and correct under
 * the back button — none of which is true of state held in a component. It
 * also keeps the page server-rendered, which is where the rows are.
 *
 * Changing a filter always resets to page one. Being left on page four of a
 * result set that now has two pages is the most reliable way to make a working
 * filter look broken.
 */

export interface ChipOption {
  value: string;
  label: string;
  count?: number;
}

export interface SelectFilter {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

export function FilterBar({
  searchPlaceholder = "Search…",
  chipName,
  chips,
  selects = [],
  children,
}: {
  searchPlaceholder?: string;
  /** Query parameter the chips write to, e.g. "status". */
  chipName?: string;
  chips?: ChipOption[];
  selects?: SelectFilter[];
  /** Anything extra, e.g. a sort control. */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [term, setTerm] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);

  function apply(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  /**
   * Debounced search.
   *
   * 350ms: long enough that typing "panjabi" is one query rather than seven,
   * short enough that it still feels like the list is answering as you type.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      if ((params.get("q") ?? "") !== term) apply({ q: term.trim() || null });
    }, 350);
    return () => window.clearTimeout(id);
    // `apply` and `params` are read fresh on each run; re-subscribing on every
    // params change would restart the timer as the URL updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const active = chipName ? (params.get(chipName) ?? "all") : null;
  const hasFilters =
    Boolean(params.get("q")) ||
    Boolean(chipName && params.get(chipName)) ||
    selects.some((s) => params.get(s.name));

  return (
    /*
      Two rows on a phone, one wherever the width allows. The chrome above a
      list is not the work — every line of it is a row of orders the operator
      cannot see.
    */
    <div className={cn("space-y-2", pending && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        {/*
          Full width on a phone. Sharing a line with three dropdowns squeezed
          the search box down to an icon and a couple of characters — and search
          is the filter somebody reaches for when they have a customer on the
          phone reading out an order number.
        */}
        <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
          <label htmlFor="filter-q" className="sr-only">
            Search
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="filter-q"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(inputClass(), "h-10 bg-canvas pl-9")}
          />
        </div>

        {selects.map((s) => (
          <div key={s.name}>
            <label htmlFor={`filter-${s.name}`} className="sr-only">
              {s.label}
            </label>
            <select
              id={`filter-${s.name}`}
              value={params.get(s.name) ?? "all"}
              onChange={(e) => apply({ [s.name]: e.target.value })}
              className={cn(inputClass(), "h-10 w-auto bg-canvas pr-8 text-[13px]")}
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {children}

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              startTransition(() => router.replace(pathname));
            }}
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:text-ink"
          >
            Clear
          </button>
        ) : null}
      </div>

      {chipName && chips && chips.length > 0 ? (
        <div className="rail rail-bleed gap-1.5 sm:flex sm:flex-wrap sm:overflow-visible">
          {chips.map((c) => {
            const on = active === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => apply({ [chipName]: c.value })}
                aria-pressed={on}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap",
                  "transition-colors duration-[var(--dur-base)] [transition-timing-function:var(--ease-out-soft)]",
                  on
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-canvas text-ink-soft hover:border-ink hover:text-ink",
                )}
              >
                {c.label}
                {typeof c.count === "number" ? (
                  <span
                    className={cn(
                      "tabular text-[11px]",
                      on ? "text-white/70" : "text-ink-muted",
                    )}
                  >
                    {c.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
