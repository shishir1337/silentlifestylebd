"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/**
 * Everything that is not the buy decision, in one place.
 *
 * These were three stacked blocks: the description, then a panel repeating the
 * delivery promises, and no size chart at all — the size guide was a link to
 * `/size-guide`, a separate page listing every chart the shop has. A shopper
 * deciding between M and L was sent off the page they were buying on, to a
 * page that opened on panjabi chest measurements, and left to find their own
 * way back.
 *
 * Tabs rather than stacked sections because only one of the three is ever
 * wanted at a time, and stacking them put nine hundred pixels between the
 * buttons and the related products. Tabs also give the size guide somewhere to
 * *be* on this page, which is what makes the link beside the size selector
 * able to stay here instead of navigating away.
 *
 * The panel is not lazy: all three are rendered, and the inactive ones are
 * `hidden`. It is a few hundred words of text, so there is nothing to gain by
 * deferring it, and it means the page still reads completely with JavaScript
 * unavailable and Ctrl-F still finds the size chart.
 */

export interface ProductTab {
  id: string;
  label: string;
  content: ReactNode;
}

export const SIZE_CHART_TAB = "size-chart";

/**
 * Lets the size selector open the size-chart tab further down the page.
 *
 * The two are in different branches of a server-rendered tree — the selector
 * is in the right-hand column, the tabs are below both columns — so there is
 * no common client parent to hold the state unless one is put there. This
 * provider is that parent. Both consumers are client components, so ordinary
 * context works across the server children passed through it.
 *
 * `null` outside a provider rather than a thrown error: the selector renders
 * on its own in tests and on any page that has no tabs, and a missing size
 * guide is not a crash.
 */
interface SizeGuideApi {
  signal: { id: string; nonce: number } | null;
  open: () => void;
}

const SizeGuideContext = createContext<SizeGuideApi | null>(null);

export function SizeGuideProvider({ children }: { children: ReactNode }) {
  const [signal, setSignal] = useState<SizeGuideApi["signal"]>(null);

  const open = useCallback(() => {
    // A fresh nonce each time, so asking twice scrolls back twice.
    setSignal({ id: SIZE_CHART_TAB, nonce: Date.now() });
  }, []);

  const value = useMemo<SizeGuideApi>(() => ({ signal, open }), [signal, open]);
  return <SizeGuideContext.Provider value={value}>{children}</SizeGuideContext.Provider>;
}

export function useSizeGuide(): SizeGuideApi | null {
  return useContext(SizeGuideContext);
}

export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const region = useRef<HTMLDivElement>(null);
  const uid = useId();
  const openSignal = useSizeGuide()?.signal ?? null;

  /*
    A nonce rather than the id alone: tapping "Size guide" twice should scroll
    back to the chart both times, and an effect keyed on an unchanged id would
    not run the second time.
  */
  useEffect(() => {
    if (!openSignal) return;
    if (!tabs.some((t) => t.id === openSignal.id)) return;
    setActive(openSignal.id);
    region.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [openSignal, tabs]);

  if (tabs.length === 0) return null;

  /** Left/right arrows move between tabs, which is what a tablist promises. */
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${uid}-tab-${next.id}`)?.focus();
  }

  return (
    <div ref={region} className="mt-8 scroll-mt-24 border-t border-line pt-6">
      {/*
        The strip scrolls sideways on a narrow phone rather than wrapping to
        two rows — three tabs fit at 360px today, but a fourth would silently
        become a second row of chrome above the content.
      */}
      {/*
        A heading for the region, for the outline rather than for the eye.

        The tabs name themselves on screen, so nothing here needs drawing — but
        a heading outline is a separate thing from a visual one, and without
        this the page went straight from the product's h1 to the "Details" h3
        inside this panel. A skipped level is the one structural error both a
        screen reader's heading list and a search crawler's outline actually
        notice, on every product page at once.

        It says the same words the tablist is labelled with, so the two cannot
        drift.
      */}
      <h2 className="sr-only">Product information</h2>

      <div
        role="tablist"
        aria-label="Product information"
        className="rail rail-bleed -mb-px gap-1 border-b border-line sm:flex sm:overflow-visible"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-[14px] font-medium whitespace-nowrap",
                "transition-colors duration-[var(--dur-base)]",
                selected
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-panel-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="pt-5"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
