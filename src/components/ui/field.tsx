import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Form primitives.
 *
 * These existed as near-identical private copies in the checkout and profile
 * forms; auth adds three more forms, at which point five copies of a label and
 * an error paragraph stop being a coincidence. Collected here so a field looks
 * and announces itself the same way wherever it appears.
 */

/**
 * Input classes.
 *
 * The `text-[16px]` on phones is load-bearing, not a typo: iOS Safari zooms the
 * whole page when a focused input's text is under 16px, and the shopper is then
 * left scrolled sideways mid-checkout. Pointer devices get 14px back at `sm`.
 *
 * No `focus:outline-none` here. It used to be, and it took the global
 * `:focus-visible` ring with it — leaving a keyboard user with a one-pixel
 * border tint as the only sign of where they were, on the checkout as much as
 * in the admin. The border still shifts on focus for pointer users; the ring is
 * what a keyboard user needs, and `:focus-visible` already withholds it from
 * everyone else.
 */
export function inputClass(invalid?: boolean) {
  return cn(
    "h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3 text-[16px] sm:text-[14px]",
    "placeholder:text-ink-muted",
    invalid ? "border-sale focus:border-sale" : "border-line-strong focus:border-brand",
  );
}

export function Field({
  label,
  id,
  hint,
  error,
  required,
  hideLabel,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Keeps the label for screen readers where the design omits it visually. */
  hideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={cn("block text-[13px] font-medium", hideLabel && "sr-only")}
      >
        {label}
        {required ? (
          <span className="text-sale" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      <div className={hideLabel ? undefined : "mt-1.5"}>{children}</div>

      {/*
        `role="alert"` rather than a live region on a wrapper: the error appears
        and disappears with the element, and a live region that is empty most of
        the time announces inconsistently across screen readers.
      */}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12px] text-sale">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
