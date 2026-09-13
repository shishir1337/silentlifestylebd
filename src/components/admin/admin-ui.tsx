import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Admin building blocks.
 *
 * Denser and flatter than the storefront's. A shop page is trying to sell
 * something and can afford air; these screens are read at speed by someone
 * who has done the same task forty times today, so they favour scannability —
 * tighter rhythm, one elevation step, and figures that line up.
 */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-line bg-canvas shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
      <h2 className="text-[14px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-[var(--radius-md)] border border-dashed border-line-strong bg-canvas px-6 py-14 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}

/**
 * A single figure.
 *
 * `tabular` on the number is not decoration: these sit in a row and re-render
 * as data changes, and proportional digits make the whole row twitch as the
 * values shift.
 */
export function Stat({
  label,
  value,
  hint,
  href,
  tone = "neutral",
  alarm = false,
}: {
  label: string;
  /** A node so money can come through `<Taka>` and keep its font stack. */
  value: ReactNode;
  hint?: string;
  href?: string;
  tone?: "neutral" | "warn" | "good";
  /** Drives the warning treatment; `value` may be a node, so it is explicit. */
  alarm?: boolean;
}) {
  const alarming = tone === "warn" && alarm;

  const body = (
    <>
      <dt className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "tabular mt-2 font-display text-[26px] leading-none font-bold",
          alarming && "text-sale",
          tone === "good" && "text-brand",
        )}
      >
        {value}
      </dd>
      {hint ? (
        <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">{hint}</p>
      ) : null}
    </>
  );

  const shell =
    "block rounded-[var(--radius-md)] border bg-canvas p-4 shadow-[var(--shadow-card)] transition-colors duration-[var(--dur-base)] [transition-timing-function:var(--ease-out-soft)]";

  return href ? (
    <Link
      href={href}
      className={cn(
        shell,
        alarming ? "border-sale/30 hover:border-sale" : "border-line hover:border-ink",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cn(shell, alarming ? "border-sale/30" : "border-line")}>{body}</div>
  );
}

/** Status and state, in a shape that is not colour alone — the word carries it. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "on" | "off" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase",
        tone === "on" && "bg-brand-tint text-brand",
        tone === "off" && "bg-muted text-ink-muted",
        tone === "warn" && "bg-sale-tint text-sale",
        tone === "neutral" && "bg-subtle text-ink-soft",
      )}
    >
      {children}
    </span>
  );
}

/**
 * A table that survives a phone.
 *
 * The wrapper scrolls horizontally rather than letting the table push the page
 * sideways — the single most common way an admin panel breaks on mobile.
 */
export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">{children}</div>
  );
}
