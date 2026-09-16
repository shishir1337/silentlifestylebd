/**
 * Shown while an admin page fetches.
 *
 * Every screen here is dynamic — they read the database on each request by
 * design — so a navigation has a real gap. A skeleton that reserves the shape
 * of what is coming keeps the layout still and reads as "loading"; a spinner
 * in the middle of an empty page reads as "broken".
 *
 * `animate-pulse` is opacity only, so it respects reduced motion without a
 * special case and costs nothing on the main thread.
 *
 * ## Why an admin 404 answers 200, and why that is the right trade
 *
 * This file is a Suspense boundary around every page in `/admin`. Streaming
 * sends the headers before the page has finished, so a `notFound()` thrown
 * afterwards renders the right screen and cannot change a status already on
 * the wire. `loading.md` says so plainly: "To start streaming, the response
 * headers must be set. This is why it is not possible to change the status
 * code after streaming started."
 *
 * Measured rather than assumed, and it costs nothing here:
 *
 *   - The storefront — the only part of this site a crawler reaches — returns
 *     a real 404. `/products/*`, `/collections/*` and the catch-all were each
 *     checked and each answered 404, because none of them is behind a loading
 *     boundary.
 *   - `/admin` is not reachable to be mis-indexed. An anonymous request is
 *     redirected to `/signin` with a 307; a crawler never sees the page at all.
 *   - Next injects `noindex` into a streamed 404 anyway. A missing order in the
 *     panel serves three robots tags: this route's own `noindex, nofollow` and
 *     two from Next.
 *
 * The two documented fixes both cost more than the problem. Checking existence
 * in `proxy` means a database query on every admin request including
 * prefetches, which the docs specifically warn against; deleting this file
 * means every screen in a panel where every page is dynamic loses its skeleton
 * and navigation goes back to reading as broken.
 *
 * So it stands, deliberately. Written down because it looks like a bug, and
 * the next person to notice it should find this rather than repeat the work.
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 sm:py-7" aria-busy="true">
      <div className="h-7 w-40 animate-pulse rounded-[var(--radius-sm)] bg-muted" />
      <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-[var(--radius-xs)] bg-muted/70" />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-[var(--radius-md)] border border-line bg-canvas"
          />
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-[var(--radius-md)] border border-line bg-canvas"
          />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
