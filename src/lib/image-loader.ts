import type { ImageLoaderProps } from "next/image";

/**
 * Custom `next/image` loader, pointing at ImageKit.
 *
 * Every catalogue image is resized and format-converted at ImageKit's edge
 * instead of by the Node process, so the VPS never decodes a JPEG. Measured on
 * the hero banner: 108 KB original JPEG versus 14 KB WebP at `w-828`.
 *
 * Setting `images.loader: 'custom'` applies this to *every* `next/image` on the
 * site, including the handful of images still imported statically from
 * `src/assets`. Those arrive as a `/_next/static/media/...` path, which ImageKit
 * cannot transform, so they are returned untouched and served as-is. They are
 * already build-optimised, so the only cost is that they skip responsive
 * resizing — acceptable until the last of them moves into the media library.
 *
 * ## No `"use client"` here, despite the docs example
 *
 * `images.loaderFile` is not passed as a prop; the build aliases this module
 * over `next/dist/shared/lib/image-loader`, which `get-img-props` imports in
 * *both* environments. Marking it a client module makes it a client reference
 * the server cannot invoke, and the hero — which calls `getImageProps` during
 * prerender for its `<picture>` art direction — fails the build with
 * "Attempted to call the default export ... from the server, but it's on the
 * client". The function is pure and touches no browser API, so it belongs in
 * both graphs.
 */
export default function imagekitLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  // Not an ImageKit asset (local static import, or an inline data URI).
  if (!src.startsWith("http")) return src;

  const transforms = [
    `w-${width}`,
    `q-${quality ?? 75}`,
    // Serve AVIF/WebP when the browser advertises support, JPEG otherwise.
    "f-auto",
    // Never upscale past the source; a 2x request for a 1000px original should
    // return 1000px rather than an interpolated, heavier 2000px.
    "c-at_max",
  ].join(",");

  // ImageKit accepts transforms as a query string, which leaves the stored URL
  // usable on its own and keeps the DB free of presentation concerns.
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}tr=${transforms}`;
}
