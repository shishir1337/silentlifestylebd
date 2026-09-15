import type { ImageRef } from "@/types/catalog";

/**
 * Adapters from a database `ImageRef` to `next/image` props.
 *
 * A static import handed `next/image` a `StaticImageData` object carrying the
 * intrinsic size and a blur placeholder, and the component read them off the
 * `src` prop itself. A URL from the database carries none of that, so the same
 * three values — width, height, blurDataURL — have to be passed explicitly or
 * the layout shift this site was built to avoid comes straight back.
 *
 * Both helpers spread into `<Image>`; `alt` stays at the call site, because it
 * depends on whether the image is meaningful or decorative in that context and
 * only the call site knows.
 */

/** Intrinsic-size image: the element sizes itself from the file. */
export function imageProps(ref: ImageRef) {
  return {
    src: ref.url,
    width: ref.width,
    height: ref.height,
    ...blur(ref),
  };
}

/** `fill` image: the parent is the sized box, so dimensions would be ignored. */
export function fillProps(ref: ImageRef) {
  return {
    src: ref.url,
    fill: true as const,
    ...blur(ref),
  };
}

/**
 * Only claim `placeholder="blur"` when there is something to show. Passing the
 * prop without `blurDataURL` is a runtime error in `next/image`, and an asset
 * uploaded before the placeholder step existed would otherwise crash the page
 * it appears on.
 */
function blur(ref: ImageRef) {
  return ref.blurDataURL
    ? { placeholder: "blur" as const, blurDataURL: ref.blurDataURL }
    : {};
}

/**
 * A still frame for a video, from ImageKit.
 *
 * ImageKit generates one on demand: append `/ik-thumbnail.jpg` to the video's
 * URL and it returns a frame from the start of the clip. No second upload, no
 * column to keep in step with the file, and it is regenerated if the video is
 * ever replaced at the same path.
 *
 * It matters more than a nicety. A `<video>` with no poster paints a black
 * rectangle until the browser has fetched enough of the file to decode a
 * frame — so a product gallery would show a black hole where the video is,
 * on exactly the connections least able to fill it quickly. With a poster, the
 * video looks like the rest of the gallery until somebody presses play.
 *
 * A transform can be appended after it like any other ImageKit URL:
 *
 *   posterFor(url) + "?tr=w-828,q-75,f-auto"
 */
export function posterFor(videoUrl: string): string {
  // Query strings are transforms, not part of the path; keep them off the end.
  const [path] = videoUrl.split("?");
  return `${path.replace(/\/$/, "")}/ik-thumbnail.jpg`;
}
