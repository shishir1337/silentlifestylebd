"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/cn";

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
  images: StaticImageData[];
  alt: string;
  badge?: { label: string; className: string } | null;
  soldOut?: boolean;
}) {
  const [active, setActive] = useState(0);
  const single = images.length < 2;

  return (
    <div className="sm:flex sm:gap-3">
      {/* Thumbnails — pointer devices only. */}
      {!single ? (
        <ul className="hidden shrink-0 flex-col gap-2 sm:flex">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors duration-[var(--dur-base)] lg:size-20",
                  i === active ? "border-ink" : "border-transparent hover:border-line-strong",
                )}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  sizes="80px"
                  quality={60}
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="min-w-0 flex-1">
        {/* Phone: swipeable filmstrip. Desktop: just the active image. */}
        <div
          className={cn(
            "relative overflow-hidden rounded-[var(--radius-md)] bg-subtle",
            "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:block sm:overflow-visible",
          )}
        >
          {images.map((img, i) => (
            <div
              key={img.src}
              className={cn(
                "relative aspect-4/5 w-full shrink-0 snap-start overflow-hidden rounded-[var(--radius-md)] bg-subtle",
                // Above `sm` only the selected image occupies the frame.
                i === active ? "sm:block" : "sm:hidden",
              )}
            >
              <Image
                src={img}
                alt={i === 0 ? alt : ""}
                fill
                // The first product image is the LCP element on this route.
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : "auto"}
                sizes="(min-width:1024px) 42vw, (min-width:640px) 55vw, 100vw"
                quality={75}
                placeholder="blur"
                className="object-cover"
              />
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

        {/* Phone: dots mirror the filmstrip position without needing JS to scroll. */}
        {!single ? (
          <p className="mt-2 text-center text-[11px] text-ink-muted sm:hidden">
            Swipe for more photos
          </p>
        ) : null}
      </div>
    </div>
  );
}
