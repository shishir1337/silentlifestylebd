"use client";

import { useEffect, useRef } from "react";

/**
 * A product clip that plays when you look at it.
 *
 * It used to wait for a second press. The thumbnail carried a play badge and
 * said "Play the video", and selecting it only put the video in the frame —
 * paused, with its own play button to find and press again. Most people do not
 * press twice; they conclude the video is broken and scroll on.
 *
 * So it plays when it becomes the thing on screen, and pauses the moment it is
 * not. That single rule covers both layouts without either of them having to
 * know about the other: on a phone the gallery is a swipe filmstrip and the
 * clip starts as it lands in the frame, and on a pointer device the unselected
 * items are `display:none`, which is not visible either. Resize between the two
 * mid-swipe and it still holds.
 *
 * ## Why an observer rather than the selected index
 *
 * The gallery tracks two different indexes — a thumbnail selection and a
 * scroll position — because the two layouts never apply at once. Playing from
 * either would mean knowing which breakpoint is live, in JavaScript, which is
 * the thing CSS is for. Visibility is the fact both layouts already express.
 *
 * It also pauses when the shopper scrolls the gallery off the page entirely,
 * which the index cannot know and which is the difference between a clip that
 * stops and a clip that keeps spending somebody's mobile data at the checkout.
 *
 * ## Muted, and why that is not a compromise
 *
 * Browsers only allow a video to start itself when it is muted; an unmuted
 * `play()` here would be rejected and the clip would sit paused again. The
 * controls stay on, so sound is one tap away for anyone who wants it. These
 * are short silent clips of a garment turning — the sound was never the point.
 *
 * ## Reduced motion
 *
 * A viewer who has asked their system for less movement does not get a video
 * that starts itself. They get the poster and the controls, which is what the
 * setting means.
 */
export function GalleryVideo({
  src,
  poster,
  label,
  className,
}: {
  src: string;
  poster?: string | null;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          /*
            `play()` returns a promise that rejects more often than it looks
            like it should — a browser in low-power mode, a tab that is not
            foreground, a file still being fetched. Unhandled, that is an
            uncaught rejection in the console of a shop that is working fine.
          */
          el.play().catch(() => {});
        } else if (!el.paused) {
          el.pause();
        }
      },
      /*
        Half of it, because the phone filmstrip snaps: mid-swipe two clips are
        each partly in the frame, and a lower threshold would start both. At a
        half, only the one being swiped to qualifies.
      */
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // biome-ignore lint/a11y/useMediaCaption: no caption track exists to offer — see below.
    <video
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      controls
      muted
      loop
      playsInline
      /*
        Still `metadata`, not `auto`. Most of this shop's customers are on
        mobile data they pay for by the megabyte, and nothing but the header is
        fetched until the clip is actually reached — which is now also the
        moment it starts, so nothing is downloaded that nobody watched.
      */
      preload="metadata"
      /*
        No `<track>`, and that is a real gap rather than an oversight worth
        hiding. These are short silent clips of a garment — a shop uploads one
        from a phone and has no caption file to go with it, and an empty track
        element would claim captions exist when they do not. If narrated video
        is ever added, this needs a caption upload beside it and the
        suppression above should come off.
      */
      aria-label={label}
      className={className}
    />
  );
}
