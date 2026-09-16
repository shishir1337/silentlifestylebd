"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { fillProps } from "@/lib/image";
import { isVideo, type ImageRef } from "@/types/catalog";
import { GalleryVideo } from "./gallery-video";

/**
 * Product gallery.
 *
 * On phones this is a scroll-snap filmstrip — swiping is how people look at
 * product photos on a phone, and it needs no JavaScript to work. From `sm` up
 * it becomes a main image with thumbnails, where a pointer makes clicking
 * faster than scrolling.
 *
 * The `<img>` elements are the same in both modes; only the layout changes, so
 * an image is never downloaded twice.
 */
export function ProductGallery({
  images,
  alt,
  badge,
  soldOut,
}: {
  images: ImageRef[];
  alt: string;
  badge?: { label: string; className: string } | null;
  soldOut?: boolean;
}) {
  const [active, setActive] = useState(0);
  const single = images.length < 2;

  /**
   * Which photo the filmstrip has been swiped to.
   *
   * Separate from `active`, which is the thumbnail selection on pointer
   * devices. The two never apply at the same breakpoint, and conflating them
   * would make a tap on a desktop thumbnail try to scroll a strip that is not
   * on screen.
   *
   * Read from scroll position rather than from an observer: the strip is
   * snap-mandatory, so its offset divided by its width *is* the index, and
   * rounding is enough. No listener library, no `IntersectionObserver`, and it
   * stays correct if the frame is resized mid-swipe.
   */
  const strip = useRef<HTMLDivElement>(null);
  const [swiped, setSwiped] = useState(0);

  function onStripScroll() {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setSwiped((prev) => (prev === i ? prev : Math.min(Math.max(i, 0), images.length - 1)));
  }

  return (
    <div className="sm:flex sm:gap-3">
      {/* Thumbnails — pointer devices only. */}
      {!single ? (
        <ul className="hidden shrink-0 flex-col gap-2 sm:flex">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={
                  isVideo(img)
                    ? `Play the video, item ${i + 1} of ${images.length}`
                    : `View image ${i + 1} of ${images.length}`
                }
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors duration-[var(--dur-base)] lg:size-20",
                  i === active ? "border-ink" : "border-transparent hover:border-line-strong",
                )}
              >
                <Image
                  {...fillProps(img)}
                  // A video's thumbnail is the poster ImageKit renders from
                  // the clip; the file itself would be a wasted download here.
                  src={isVideo(img) ? (img.poster ?? img.url) : img.url}
                  alt=""
                  sizes="80px"
                  quality={60}
                  className="object-cover"
                />

                {/*
                  Marked as video rather than left to be guessed from a still.
                  A thumbnail that looks like every other thumbnail and then
                  behaves differently is the kind of surprise that makes people
                  stop exploring a gallery.
                */}
                {isVideo(img) ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center bg-ink/25"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-ink/80">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-3 translate-x-px text-white"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/*
        `relative` so the counter below can sit on the frame without sitting
        *inside* the scroller — a child of the strip would scroll away with the
        photos, which is exactly what a position indicator must not do.
      */}
      <div className="relative min-w-0 flex-1">
        {/* Phone: swipeable filmstrip. Desktop: just the active image. */}
        <div
          ref={strip}
          onScroll={onStripScroll}
          className={cn(
            "relative overflow-hidden rounded-[var(--radius-md)] bg-subtle",
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:block sm:overflow-visible",
          )}
        >
          {images.map((img, i) => (
            <div
              key={img.url}
              className={cn(
                "relative aspect-4/5 w-full shrink-0 snap-start overflow-hidden rounded-[var(--radius-md)] bg-subtle",
                // Above `sm` only the selected image occupies the frame.
                i === active ? "sm:block" : "sm:hidden",
              )}
            >
              {isVideo(img) ? (
                /*
                  Plays itself once it is the item on screen. See
                  `GalleryVideo` — the rule is visibility, which is the one
                  fact both the phone filmstrip and the desktop thumbnails
                  already express, so neither needs to know about the other.
                */
                <GalleryVideo
                  src={img.url}
                  poster={img.poster}
                  label={`${alt} — video`}
                  className="absolute inset-0 size-full bg-ink object-cover"
                />
              ) : (
                <Image
                  {...fillProps(img)}
                  alt={i === 0 ? alt : ""}
                  // The first product image is the LCP element on this route.
                  priority={i === 0}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  sizes="(min-width:1024px) 42vw, (min-width:640px) 55vw, 100vw"
                  quality={75}
                  className="object-cover"
                />
              )}
            </div>
          ))}

          {badge ? (
            <span
              className={cn(
                "pointer-events-none absolute top-3 left-3 z-10 rounded-[var(--radius-xs)] px-2 py-1 text-[10px] font-semibold tracking-wide uppercase",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          ) : null}

          {soldOut ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-ink/85 py-2.5 text-center text-[12px] font-medium tracking-wide text-white uppercase">
              Out of stock
            </span>
          ) : null}
        </div>

        {/*
          The count, on the picture.

          This was the sentence "Swipe for more photos" on its own line under
          the frame — forty-eight pixels of instruction on the page with the
          least room to spare, telling people to do the thing their thumb
          already does. A count sits inside the frame, costs no height at all,
          and answers the question the sentence was really asked to answer:
          how many more are there.

          Not interactive, deliberately: there is nothing to tap that swiping
          does not already do, and a dot small enough to fit here would be
          under the minimum target size anyway.
        */}
        {!single ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 bottom-3 z-10 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm sm:hidden"
          >
            <span className="tabular">{swiped + 1}</span> / {images.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}
