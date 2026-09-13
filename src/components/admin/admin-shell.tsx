import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { AdminNav } from "./admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { StaffUser } from "@/lib/dal";

/**
 * The frame around every admin screen.
 *
 * Note what it does not do: gate anything. A layout does not control whether
 * its child segments render — the router renders them regardless and they reach
 * the RSC payload — so each page calls `requireCatalogAccess()` itself and
 * passes the result down here. This component only draws.
 */
export function AdminShell({
  staff,
  title,
  lead,
  action,
  children,
}: {
  staff: StaffUser;
  title: string;
  lead?: string;
  /** The one thing this screen is mainly for, e.g. "Add product". */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-subtle/40">
      <div className="border-b border-line bg-canvas">
        <Container>
          <div className="flex h-14 items-center justify-between gap-4">
            <Link href="/admin" className="text-[15px] font-semibold tracking-tight">
              Silent Lifestyle{" "}
              <span className="font-normal text-ink-muted">admin</span>
            </Link>
            <div className="flex items-center gap-1">
              {/* The storefront, not a preview: what the client sees here is
                  what a customer sees, which is the only way to trust an edit. */}
              <Link
                href="/"
                className="hidden h-9 items-center rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:bg-muted hover:text-ink sm:inline-flex"
              >
                View shop
              </Link>
              <SignOutButton />
            </div>
          </div>
        </Container>
      </div>

      <AdminNav role={staff.role} />

      <Container>
        <div className="py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[28px]">
                {title}
              </h1>
              {lead ? (
                <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">{lead}</p>
              ) : null}
            </div>
            {action}
          </div>

          <div className="mt-6">{children}</div>
        </div>
      </Container>
    </div>
  );
}
