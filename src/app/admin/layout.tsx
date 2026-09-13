import type { Metadata } from "next";
import { AdminFrame } from "@/components/admin/admin-frame";
import { requireStaff } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Silent Lifestyle admin" },
  robots: { index: false, follow: false },
};

/**
 * The admin shell.
 *
 * Reads the session so the sidebar can show who is signed in and hide sections
 * their role cannot use — but note what that is and is not. It is **not** the
 * gate. A layout does not control whether its child segments render; the router
 * renders them regardless and they reach the RSC payload. Every page under here
 * calls the DAL for itself, and this reads it only to draw a name and a menu.
 *
 * `requireStaff()` here does mean a signed-out visitor is redirected before any
 * of this paints, which is a nicety, not the lock.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();

  // The one number worth carrying in the navigation: parcels waiting on a
  // human. Everything else the operator goes looking for; this finds them.
  const pendingOrders = await db.order.count({ where: { status: "PENDING" } });

  return (
    <AdminFrame
      role={staff.role}
      staffName={staff.name}
      staffEmail={staff.email}
      pendingOrders={pendingOrders}
    >
      {children}
    </AdminFrame>
  );
}
