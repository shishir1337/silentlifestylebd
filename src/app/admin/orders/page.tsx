import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card } from "@/components/admin/admin-ui";
import { requireStaff } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Orders · Admin",
  robots: { index: false, follow: false },
};

/**
 * Orders — the list, pending the full workflow in the next phase.
 *
 * It exists now because the navigation links to it. A tab that 404s teaches an
 * operator that parts of their own admin panel are broken, which is a far more
 * expensive lesson than an unfinished screen saying so plainly.
 *
 * Any staff role reaches this: confirming and dispatching parcels is exactly
 * what a Staff account is for.
 */
export default async function AdminOrdersPage() {
  const staff = await requireStaff();

  const [total, pending, recent] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 10,
      select: {
        orderNo: true,
        customerName: true,
        customerPhone: true,
        status: true,
        total: true,
        placedAt: true,
      },
    }),
  ]);

  return (
    <AdminPage
      title="Orders"
      lead={`${total} in total, ${pending} waiting to be confirmed.`}
    >
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Latest orders</h2>
        <ul className="mt-3 divide-y divide-line">
          {recent.map((o) => (
            <li key={o.orderNo} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="tabular text-[13px] font-medium">{o.orderNo}</p>
                <p className="text-[12px] text-ink-muted">
                  {o.customerName} · <span className="tabular">{o.customerPhone}</span>
                </p>
              </div>
              <p className="tabular text-[13px]">
                ৳{o.total.toLocaleString("en-BD")}{" "}
                <span className="ml-2 text-[11px] tracking-wide text-ink-muted uppercase">
                  {o.status}
                </span>
              </p>
            </li>
          ))}
          {recent.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-ink-muted">No orders yet.</li>
          ) : null}
        </ul>

        <p className="mt-4 rounded-[var(--radius-sm)] bg-subtle px-3.5 py-3 text-[13px] leading-relaxed text-ink-muted">
          Confirming, packing and marking orders delivered — along with filters,
          search and the audit trail — arrive in the next phase. Until then this
          is a read-only view so nothing placed is invisible to you.
        </p>
      </Card>
    </AdminPage>
  );
}
