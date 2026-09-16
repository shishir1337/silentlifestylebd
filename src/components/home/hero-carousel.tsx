"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Hero carousel.
 *
 * The scrolling itself is native CSS scroll-snap, so the slides are swipeable,
 * keyboard-scrollable and fully readable with JavaScript disabled or still
 * loading. This component only *adds* affordances on top: dots, arrows and
 * auto-advance. That ordering matters — the hero is above the fold, and a
 * carousel whose slides only work after hydration is a blank box on a slow
 * Bangladeshi 3G connection.
 *
 * Auto-advance obeys WCAG 2.2.2: it never runs under `prefers-reduced-motion`,
 * pauses on hover and on keyboard focus, and exposes an explicit pause control.
 */
export function HeroCarousel({
  children,
  slideLabels,
  interval = 6000,
}: {
  children: ReactNode;
  /** One label per slide, used for the dot controls. */
  slideLabels: string[];
  interval?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const count = slideLabels.length;

  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [suspended, setSuspended] = useState(false); // hover / focus
  const [reduced, setReduced] = useState(true); // assume reduced until proven otherwise

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /**
   * Track the visible slide with an IntersectionObserver rooted on the track
   * rather than a scroll listener — it fires only on change instead of on
   * every frame of a momentum scroll.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the ref is null until the dialog mounts, so `mounted` is what makes this run at the moment there is a node to listen to.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.55) {
            const i = Number((e.target as HTMLElement).dataset.slide);
            if (!Number.isNaN(i)) setActive(i);
          }
        }
      },
      { root: track, threshold: [0.55] },
    );
    for (const child of Array.from(track.children)) io.observe(child);
    return () => io.disconnect();
  }, [count]);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = (index + count) % count;
      track.scrollTo({
        left: track.clientWidth * next,
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [count, reduced],
  );

  // `active` in the deps is deliberate: every advance — automatic or manual —
  // restarts the dwell timer, so a slide the user just chose gets a full turn.
  useEffect(() => {
    if (reduced || userPaused || suspended || count < 2) return;
    const id = window.setTimeout(() => goTo(active + 1), interval);
    return () => window.clearTimeout(id);
  }, [active, reduced, userPaused, suspended, count, interval, goTo]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
  };

  const autoplayOn = !reduced && !userPaused && count > 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions"
      onKeyDown={onKeyDown}
      onPointerEnter={() => setSuspended(true)}
      onPointerLeave={() => setSuspended(false)}
      onFocusCapture={() => setSuspended(true)}
      onBlurCapture={() => setSuspended(false)}
    >
      <div className="relative isolate">
        <div
          ref={trackRef}
          // `overscroll-x-contain` stops a swipe past the last slide from
          // triggering the browser's back gesture on iOS.
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>

        {count > 1 && (
          <>
            {/* Arrows carry their own solid backing, so they stay legible
                whatever the banner artwork happens to be. Pointer-only. */}
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="Previous slide"
              className="absolute top-1/2 left-4 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/90 text-ink shadow-[var(--shadow-card)] backdrop-blur-sm transition hover:bg-canvas lg:inline-flex"
            >
              <ChevronRightIcon className="size-5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="Next slide"
              className="absolute top-1/2 right-4 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/90 text-ink shadow-[var(--shadow-card)] backdrop-blur-sm transition hover:bg-canvas lg:inline-flex"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </>
        )}
      </div>

      {/*
        Controls sit below the banner, not on it. Merchant artwork is arbitrary
        — it can be light, busy, or carry its own copy at the bottom edge — and
        anything overlaid would eventually land on a background it cannot be
        read against, or cover the very words the banner is selling with.
      */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1 border-b border-line py-1.5">
          {slideLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}: ${label}`}
              aria-current={i === active ? "true" : undefined}
              // 44px hit area around a deliberately small visual dot.
              className="group inline-flex size-11 items-center justify-center"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300 [transition-timing-function:var(--ease-out-soft)]",
                  i === active
                    ? "w-6 bg-ink"
                    : "w-1.5 bg-line-strong group-hover:bg-ink-muted",
                )}
              />
            </button>
          ))}

          <button
            type="button"
            onClick={() => setUserPaused((v) => !v)}
            aria-label={autoplayOn ? "Pause slideshow" : "Play slideshow"}
            className="inline-flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink"
          >
            {autoplayOn ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          </button>
        </div>
      )}
    </section>
  );
}
