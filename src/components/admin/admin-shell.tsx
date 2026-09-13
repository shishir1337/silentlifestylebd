import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One admin screen: its heading, its one primary action, and its content.
 *
 * The chrome around it — sidebar, top bar, who is signed in — belongs to
 * `admin/layout.tsx` and is drawn once for the whole section. This used to
 * render its own header and navigation on every page, which is why the panel
 * felt like a series of web pages rather than one tool.
 *
 * The width is capped. A product form stretched across a 27-inch monitor is a
 * line length nobody can read, and a table that wide loses the relationship
 * between the first column and the last.
 */
export function AdminPage({
  title,
  lead,
  action,
  dense,
  children,
}: {
  title: string;
  lead?: string;
  /** The single thing this screen is mainly for, e.g. "Add product". */
  action?: ReactNode;
  /**
   * For screens that *are* a list.
   *
   * On the orders queue the heading, its sentence and the filters took more
   * vertical space than three orders, and the operator's whole job is the rows
   * underneath. A form can afford the air; a queue cannot.
   */
  dense?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1180px] px-4 sm:px-6",
        dense ? "py-4 sm:py-5" : "py-5 sm:py-7",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] sm:text-[26px]">
            {title}
          </h1>
          {lead ? (
            <p className="mt-1.5 max-w-prose text-[13.5px] leading-relaxed text-ink-soft">
              {lead}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn(dense ? "mt-4" : "mt-5 sm:mt-6")}>{children}</div>
    </div>
  );
}
