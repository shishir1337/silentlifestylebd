import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireStaff } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const roleCopy = {
  OWNER: "Everything, including staff and settings.",
  MANAGER: "Catalogue, orders and site content.",
  STAFF: "Orders only.",
} as const;

/**
 * Admin landing page.
 *
 * Deliberately almost empty — the panel itself is Phases 3 to 5. What exists
 * here is the boundary: `requireStaff()` runs on the server, reads `staffRole`
 * from the database rather than from a cookie, and sends anyone without one
 * back to the storefront.
 *
 * Signed-in non-staff get a plain redirect home, not a 403. A 403 confirms the
 * admin panel is at this address; a redirect looks exactly like the page not
 * existing.
 */
export default async function AdminPage() {
  const staff = await requireStaff();

  return (
    <Container>
      <div className="py-10">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
          Admin
        </h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          Signed in as {staff.name} ({staff.email}).
        </p>

        <dl className="mt-6 max-w-md rounded-[var(--radius-md)] border border-line bg-subtle p-4 text-[14px]">
          <dt className="font-medium">Role: {staff.role}</dt>
          <dd className="mt-1 text-[13px] text-ink-muted">{roleCopy[staff.role]}</dd>
        </dl>

        <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-ink-muted">
          Catalogue, orders and content management arrive in the next phases.
          This page exists now so the sign-in and role check can be verified
          before anything is built on top of them.
        </p>

        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </Container>
  );
}
