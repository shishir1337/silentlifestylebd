"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

/**
 * Paging that keeps the filters.
 *
 * The page number joins the rest of the query string rather than replacing it,
 * so moving to page two of a filtered search stays inside that search. Losing
 * the filter on page two is the classic version of this bug and it is only
 * ever noticed by the person using it.
 *
 * Deliberately plain: previous, next, and where you are. Numbered pages help
 * when somebody knows page seven holds what they want, which for an order
 * queue is never — they search instead.
 */
export function Pagination({
  page,
  pages,
  total,
  perPage,
  noun = "items",
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  noun?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(to: number) {
    const next = new URLSearchParams(params.toString());
    if (to <= 1) next.delete("page");
    else next.set("page", String(to));
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  if (total === 0) return null;

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center justify-between gap-3",
        pending && "opacity-70",
      )}
    >
      <p className="tabular text-[13px] text-ink-muted">
        {total <= perPage ? (
          <>
            {total} {noun}
          </>
        ) : (
          <>
            {first}–{last} of {total} {noun}
          </>
        )}
      </p>

      {pages > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page <= 1 || pending}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong bg-canvas px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:pointer-events-none disabled:opacity-40"
          >
            Previous
          </button>
          <span className="tabular px-1 text-[13px] text-ink-soft">
            {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page >= pages || pending}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong bg-canvas px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:pointer-events-none disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
