import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Single source of truth for page gutters. Also publishes the gutter as a CSS
 * variable so `.rail-bleed` children can break out edge-to-edge and pull back
 * in by exactly the right amount at every breakpoint.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "nav" | "main";
}) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full max-w-[1280px]",
        "px-4 sm:px-6 lg:px-8",
        "[--gutter:1rem] sm:[--gutter:1.5rem] lg:[--gutter:2rem]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
