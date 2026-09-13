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
};

const ACTION_TONE: Record<string, "on" | "warn" | "off"> = {
  "settings.updated": "off",
  "staff.granted": "on",
  "staff.changed": "off",
  "staff.revoked": "warn",
};

/**
 * The activity log.
 *
 * Deliberately narrow. Order changes have their own trail on the order itself,
 * where whoever is asking about them is already looking. What lands here is
 * what has no other home and no other witness: settings and staff roles — the
 * two things that are changed rarely, matter a great deal, and are worth being
 * able to attribute months later.
 */
export default async function AdminAuditPage() {
  await requireStaffAccess();
  const entries = await listAudit();

  return (
    <AdminPage
      title="Activity"
      lead="Changes to your settings and to who can sign in."
    >
      {entries.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          body="Changes to settings and staff access will appear here, with who made them."
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
