import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card } from "@/components/admin/admin-ui";
import { StaffManager } from "@/components/admin/staff-manager";
import { requireStaffAccess } from "@/lib/admin/access";
import { listStaff } from "@/lib/admin/staff-reads";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

/**
 * Who can get into the admin panel.
 *
 * Owner only. This is the page that decides who can use every other page, so
 * it is the one place where the role check is the whole feature.
 */
export default async function AdminStaffPage() {
  const actor = await requireStaffAccess();
  const staff = await listStaff();

  return (
    <AdminPage
      title="Staff"
      lead="Who can sign in to this panel, and how much of it they see."
    >
      <StaffManager staff={staff} currentUserId={actor.id} />

      <Card className="mt-5 max-w-3xl p-4">
        <h2 className="text-[14px] font-semibold">If you lose access</h2>
        <p className="mt-1.5 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
          There is always at least one owner — the panel will not let the last
          one be removed, and nobody can change their own role. If every owner
          is somehow locked out, whoever hosts the site can restore access from
          the server with <span className="font-medium">pnpm admin:grant</span>.
        </p>
      </Card>
    </AdminPage>
  );
}
