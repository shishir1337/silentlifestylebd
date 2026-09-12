import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "brand";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap " +
  "rounded-[var(--radius-sm)] cursor-pointer select-none " +
  // Transform is in the transition so the press reads as a physical response.
  // It is a `scale`, never a width/height change, so nothing around it reflows.
  "transition-[background-color,border-color,color,opacity,scale] " +
  "duration-[var(--dur-base)] [transition-timing-function:var(--ease-out-soft)] " +
  "active:scale-[0.97] active:duration-[var(--dur-fast)] " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Near-black is the workhorse CTA: maximum contrast, reads premium, and
  // leaves the brand green free to mean "trust" rather than "click me".
  primary: "bg-ink text-white hover:bg-ink/90 active:bg-ink/80",
  brand: "bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-hover",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-subtle active:bg-muted",
  ghost: "bg-transparent text-ink hover:bg-muted active:bg-line",
};

// Heights meet the 44px minimum touch target at every size except `sm`,
// which is only ever used inline next to a larger primary control.
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-[52px] px-7 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  href,
  ...props
}: CommonProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
