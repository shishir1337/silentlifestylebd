"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertIcon } from "@/components/admin/admin-icons";

/**
 * When an admin screen throws.
 *
 * Written for the person running the shop, who cannot read a stack trace and
 * should not be shown one. It says what still works — the rest of the panel,
 * and the shop itself, which is served from its own cache and is almost
 * certainly still taking orders — and gives them the two things worth trying.
 *
 * `retry()` rather than `reset()`. In Next 16.3 `reset()` only clears the
 * boundary's state and re-renders the same failed data; `retry()` re-fetches
 * first, which is what actually recovers from the usual cause here — a
 * database connection that dropped for a moment.
 *
 * The error is logged to the browser console with its digest. The digest is
 * the only thing that ties what the client saw to a line in the server log,
 * so it is also printed on screen: it is the one piece of this that is worth
 * reading down a phone line.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Admin error", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-14 sm:px-6">
      <div className="flex size-11 items-center justify-center rounded-full bg-sale-tint text-sale">
        <AlertIcon className="size-5" />
      </div>

      <h1 className="font-display mt-4 text-[22px] leading-tight font-bold tracking-[-0.02em]">
        This page could not load
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        Something went wrong reading your data. Nothing has been changed, and
        your shop is still open — customers can browse and order as normal.
      </p>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
        <Link
          href="/admin"
          className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong px-4 text-[14px] font-medium hover:border-ink"
        >
          Back to the dashboard
        </Link>
      </div>

      <p className="mt-6 text-[12.5px] leading-relaxed text-ink-muted">
        If it keeps happening, the most likely cause is the database being
        unreachable — whoever hosts the site can check that. Quote this
        reference:{" "}
        <span className="tabular font-medium text-ink">
          {error.digest ?? "none recorded"}
        </span>
      </p>
    </div>
  );
}
