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
