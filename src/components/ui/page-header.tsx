import Link from "next/link";
import { ChevronRightIcon } from "./icons";

/**
 * Shared header for the standalone content pages (delivery, returns, size
 * guide, track, contact). One component so five pages cannot drift apart in
 * spacing, heading size or breadcrumb shape.
 */
export function PageHeader({
  title,
  lead,
  breadcrumb,
}: {
  title: string;
  lead?: string;
  /** Label of the current page; "Home" is always prepended. */
  breadcrumb: string;
}) {
  return (
    <header className="pt-4 pb-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-[12px] text-ink-muted">
          <li className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] transition-colors duration-[var(--dur-base)] hover:text-ink"
            >
              Home
            </Link>
            <ChevronRightIcon aria-hidden className="size-3.5 text-line-strong" />
          </li>
          <li>
            <span aria-current="page" className="inline-flex min-h-6 items-center text-ink-soft">
              {breadcrumb}
            </span>
          </li>
        </ol>
      </nav>

      <h1 className="mt-3 text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[34px]">
        {title}
      </h1>
      {lead ? (
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">{lead}</p>
      ) : null}
    </header>
  );
}

/**
 * A titled block of body copy. Content pages are mostly a stack of these, so
 * the rhythm between heading and text is defined once.
 */
export function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-6">
      <h2 id={id} className="text-[17px] font-semibold sm:text-[19px]">
        {title}
      </h2>
      <div className="mt-3 max-w-prose space-y-3 text-[14px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

/** Bulleted list with the same dot treatment used on the product page. */
export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span
            aria-hidden
            className="mt-[9px] size-1 shrink-0 rounded-full bg-line-strong"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
