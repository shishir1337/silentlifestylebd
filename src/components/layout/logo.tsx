import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Brand wordmark: "Silent Lifestyle BD".
 *
 * One component for header and footer so the two can never drift apart. The
 * whole name is always rendered — the previous mark hid "Lifestyle" below the
 * `sm` breakpoint, which left 95% of visitors reading a shop called "Silent".
 * A brand name is not a responsive detail to drop; it is the one string that
 * has to survive every screen size.
 *
 * "BD" carries the brand colour so the mark reads as deliberate rather than as
 * plain bold text, and stays legible at 14px on a 320px phone.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  /** `md` for the sticky header, `lg` for the footer. */
  size?: "md" | "lg";
}) {
  return (
    <Link
      href="/"
      aria-label="Silent Lifestyle BD — home"
      className={cn(
        // min-h-11 keeps the mark a full 44px target. Without it the anchor
        // box is only the text line (~19px), under WCAG 2.2 SC 2.5.8's 24px.
        "inline-flex min-h-11 items-center gap-[0.28em] rounded-[var(--radius-xs)] whitespace-nowrap",
        className,
      )}
    >
      <span
        className={cn(
          "font-display leading-none font-bold tracking-[-0.035em] text-ink",
          size === "md" ? "text-[15px] sm:text-[19px]" : "text-[19px]",
        )}
      >
        Silent Lifestyle
      </span>
      <span
        className={cn(
          "font-display leading-none font-bold tracking-[-0.02em] text-brand",
          size === "md" ? "text-[15px] sm:text-[19px]" : "text-[19px]",
        )}
      >
        BD
      </span>
    </Link>
  );
}
