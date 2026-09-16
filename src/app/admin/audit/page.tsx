import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card, EmptyState, Pill } from "@/components/admin/admin-ui";
import { requireStaffAccess } from "@/lib/admin/access";
import { listAudit } from "@/lib/admin/audit";

export const metadata: Metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};

/** Reads better than `settings.updated` to someone who did not write it. */
const ACTION_LABEL: Record<string, string> = {
  "settings.updated": "Settings changed",
  "staff.granted": "Access given",
  "staff.changed": "Role changed",
  "staff.revoked": "Access removed",
  "coupon.created": "Discount created",
  "coupon.changed": "Discount changed",
  "coupon.deleted": "Discount deleted",
  "order.deleted": "Order deleted",
};

const ACTION_TONE: Record<string, "on" | "warn" | "off"> = {
  "settings.updated": "off",
  "staff.granted": "on",
  "staff.changed": "off",
  "staff.revoked": "warn",
  "coupon.created": "on",
  "coupon.changed": "off",
  "coupon.deleted": "warn",
  "order.deleted": "warn",
};

/**
 * The activity log.
 *
 * Deliberately narrow. Order *changes* have their own trail on the order
 * itself, where whoever is asking about them is already looking. What lands
 * here is what has no other home and no other witness: settings, discounts and
 * staff roles — changed rarely, mattering a great deal, and worth being able to
 * attribute months later.
 *
 * A deleted order is the exception that proves it. Its own trail went with it,
 * so this is the only place left that remembers the order existed — which is
 * why that entry carries the number, the customer and the total rather than
 * just the fact that something was removed.
 */
export default async function AdminAuditPage() {
  await requireStaffAccess();
  const entries = await listAudit();

  return (
    <AdminPage
      title="Activity"
      lead="Changes to your settings, your discounts and who can sign in — and any order that was deleted."
    >
      {entries.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          body="Changes to settings, discounts and staff access will appear here, with who made them."
        />
      ) : (
        <ul className="max-w-3xl space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={ACTION_TONE[e.action] ?? "off"}>
                    {ACTION_LABEL[e.action] ?? e.action}
                  </Pill>
                  <span className="text-[12.5px] text-ink-muted">
                    by {e.actorName}
                  </span>
                  <span className="tabular ml-auto text-[12px] text-ink-muted">
                    {new Date(e.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed break-words">
                  {e.summary}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
