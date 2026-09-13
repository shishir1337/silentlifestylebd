import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Small pieces shared across admin screens.
 *
 * Kept plainer than the storefront on purpose. A shop page is trying to sell
 * something; these screens are trying to be read correctly at speed by someone
 * who has done the same task forty times today, so they favour density and
 * legibility over polish.
 */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-line bg-canvas",
        className,
      )}
    >
      {children}
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
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-line-strong bg-canvas px-6 py-14 text-center">
      <p className="text-[16px] font-medium">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "neutral" | "warn";
}) {
  const body = (
    <>
      <dt className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "tabular mt-1.5 text-[22px] font-semibold",
          tone === "warn" && value !== 0 && "text-sale",
        )}
      >
        {value}
      </dd>
      {hint ? <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p> : null}
    </>
  );

  const className =
    "block rounded-[var(--radius-md)] border border-line bg-canvas p-4 transition-colors duration-[var(--dur-base)]";

  return href ? (
    <Link href={href} className={cn(className, "hover:border-ink")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Published / hidden, and anything else with two honest states. */
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
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
