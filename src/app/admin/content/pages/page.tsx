import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card, Pill } from "@/components/admin/admin-ui";
import { requireContentAccess } from "@/lib/admin/access";
import { listPages } from "@/lib/admin/content-reads";

export const metadata: Metadata = {
  title: "Pages",
  robots: { index: false, follow: false },
};

/**
 * The written pages.
 *
 * Only the ones that are genuinely prose. Delivery, contact, stores and the
 * size guide are not here because their structure is a design — rate cards
 * driven by settings, store cards with map data, the size charts on the tab
 * beside this one. Turning those into free text would lose the layout and gain
 * nothing the client asked for.
 */
export default async function AdminPagesPage() {
  await requireContentAccess();
  const pages = await listPages();

  return (
    <AdminPage
      title="Pages"
      lead="Your policies and your story, in your words."
    >
      <ul className="space-y-2">
        {pages.map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/content/pages/${p.slug}`}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-canvas p-3.5 shadow-[var(--shadow-card)] transition-colors duration-[var(--dur-base)] hover:border-ink"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-medium">{p.title}</p>
                  {!p.isActive ? <Pill tone="off">Hidden</Pill> : null}
                  {p.slug === "privacy" || p.slug === "terms" ? (
                    <Pill tone="warn">Legal</Pill>
                  ) : null}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-muted">
                  {p.sections.length} sections · /{p.slug}
                </p>
              </div>
              <span className="tabular shrink-0 text-[12px] text-ink-muted">
                {new Date(p.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Card className="mt-5 p-4">
        <h2 className="text-[14px] font-semibold">Pages that are not here</h2>
        <p className="mt-1.5 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
          Delivery, contact and store pages are built from your settings and
          contact details rather than written out — change those and the pages
          follow. The size guide is the charts on the tab beside this one.
        </p>
      </Card>
    </AdminPage>
  );
}
