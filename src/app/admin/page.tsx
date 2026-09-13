import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Stat, Card } from "@/components/admin/admin-ui";
import { requireStaff } from "@/lib/dal";
import { getAdminCounts } from "@/lib/admin/catalog-reads";
import { CAN_MANAGE_CATALOG, can } from "@/lib/admin/access";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin overview.
 *
 * Any staff role reaches this page — it is the landing spot after signing in —
 * so it shows only what the signed-in role can act on. A Staff user who can
 * only touch orders should not be looking at a catalogue summary they cannot
 * change.
 *
 * `requireStaff()` with no argument: staff of any kind, and the DAL reads the
 * role from the database rather than the session cookie, so revoking access
 * takes effect on the next request.
 */
export default async function AdminPage() {
  const staff = await requireStaff();
  const catalog = can(staff.role, CAN_MANAGE_CATALOG);
  const counts = catalog ? await getAdminCounts() : null;

  return (
    <AdminShell
      staff={staff}
      title={`Hello, ${staff.name.split(" ")[0]}`}
      lead="Everything on the shop is managed from here."
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {counts ? (
          <>
            <Stat
              label="Products"
              value={counts.products}
              hint={counts.hidden > 0 ? `${counts.hidden} hidden` : "all visible"}
              href="/admin/products"
            />
            <Stat label="Categories" value={counts.categories} href="/admin/categories" />
            <Stat
              label="Out of stock"
              value={counts.outOfStock}
              hint="no size left"
              tone="warn"
              href="/admin/products"
            />
            <Stat label="Images" value={counts.assets} href="/admin/media" />
          </>
        ) : null}
      </dl>

      <Card className="mt-6 p-5">
        <h2 className="text-[15px] font-semibold">What you can do</h2>
        <ul className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-ink-soft">
          {catalog ? (
            <>
              <li>
                <Link href="/admin/products" className="font-medium text-brand underline underline-offset-2">
                  Products
                </Link>{" "}
                — change prices, edit descriptions, set how many of each size you
                have, and hide anything you are not selling right now.
              </li>
              <li>
                <Link href="/admin/categories" className="font-medium text-brand underline underline-offset-2">
                  Categories
                </Link>{" "}
                — rename them, change their order on the homepage, or add a new one.
              </li>
              <li>
                <Link href="/admin/media" className="font-medium text-brand underline underline-offset-2">
                  Media
                </Link>{" "}
                — upload product photos and banners.
              </li>
            </>
          ) : null}
          <li>
            Orders — confirm, pack and mark parcels delivered. (Coming next.)
          </li>
        </ul>
        <p className="mt-4 rounded-[var(--radius-sm)] bg-subtle px-3.5 py-3 text-[13px] leading-relaxed text-ink-muted">
          Changes appear on the shop within a few seconds. You never need to ask a
          developer to publish them.
        </p>
      </Card>
    </AdminShell>
  );
}
