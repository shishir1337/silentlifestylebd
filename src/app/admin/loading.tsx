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
