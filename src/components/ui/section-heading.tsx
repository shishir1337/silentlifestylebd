import Link from "next/link";
import { ChevronRightIcon } from "./icons";

/**
 * Every merchandising section gets the same header shape: a scannable title,
 * an optional one-line reason to care, and an always-visible "see all" escape
 * hatch. The link is a real target on mobile (not a hover-revealed control).
 */
export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "See all",
  id,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <h2
          id={id}
          className="text-[20px] leading-tight font-semibold sm:text-[26px]"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-ink-muted sm:text-sm">{subtitle}</p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="group -mr-1.5 inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-[var(--radius-xs)] px-1.5 text-[13px] font-medium text-brand transition-colors duration-[var(--dur-base)] hover:text-brand-hover sm:text-sm"
        >
          {linkLabel}
          <ChevronRightIcon className="size-4 transition-transform duration-200 [transition-timing-function:var(--ease-out-soft)] group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
