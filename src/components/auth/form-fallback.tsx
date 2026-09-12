/**
 * Placeholder shown while a form that reads search params hydrates.
 *
 * It reserves the exact height of the real form rather than showing a spinner,
 * so the page does not jump when the form arrives — the same reason every image
 * on this site ships with its dimensions.
 */
export function FormFallback({ fields }: { fields: number }) {
  return (
    <div aria-hidden className="space-y-4">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <div className="h-4 w-24 rounded-[var(--radius-xs)] bg-muted" />
          <div className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] bg-subtle" />
        </div>
      ))}
      <div className="h-[52px] w-full rounded-[var(--radius-sm)] bg-muted" />
    </div>
  );
}
