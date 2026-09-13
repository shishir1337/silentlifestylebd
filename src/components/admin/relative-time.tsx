import { formatOrderDate } from "@/lib/orders";

/**
 * How long ago, with the real date underneath.
 *
 * A queue is worked by age. "14 Sep 2026" makes an operator subtract dates in
 * their head to find out whether an order is from this morning or last week;
 * "2h ago" is the answer they were doing the arithmetic for. The exact date and
 * time stay on the element, for the conversation that starts "which order was
 * that, the one from the 9th?".
 *
 * Rendered on the server from a fixed reference, so it cannot disagree between
 * the server and the browser — a relative time computed in both places is the
 * classic hydration mismatch.
 */
export function RelativeTime({
  iso,
  now,
  className,
}: {
  iso: string;
  /** The moment the page was rendered, passed in so every row agrees. */
  now: number;
  className?: string;
}) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;

  const exact = new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <time dateTime={iso} title={exact} className={className}>
      {ago(now - then, iso)}
    </time>
  );
}

function ago(ms: number, iso: string): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  // Past a week the day of the month is what people actually quote.
  if (days < 7) return `${days} days ago`;
  return formatOrderDate(iso);
}
