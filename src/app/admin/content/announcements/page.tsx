import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { requireContentAccess } from "@/lib/admin/access";
import { listAnnouncements } from "@/lib/admin/content-reads";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Announcement strip",
  robots: { index: false, follow: false },
};

/**
 * The strip above the header.
 *
 * The one piece of the shop worth changing weekly — a delivery cut-off before
 * Eid, a campaign, a warning that Dhaka traffic is slow — and the one that was
 * hardcoded.
 */
export default async function AdminAnnouncementsPage() {
  await requireContentAccess();
  const [items, settings] = await Promise.all([listAnnouncements(), getSiteSettings()]);

  const money = (n: number) => `৳${n.toLocaleString("en-US")}`;
  const tokenValues = {
    "{free-over}": money(settings.delivery.freeThreshold),
    "{inside-dhaka}": money(settings.delivery.insideDhaka),
    "{outside-dhaka}": money(settings.delivery.outsideDhaka),
    "{phone}": settings.phoneDisplay,
  };

  return (
    <AdminPage
      title="Announcement strip"
      lead="The line above everything. Short, and true this week."
    >
      <AnnouncementManager items={items} tokenValues={tokenValues} />
    </AdminPage>
  );
}
