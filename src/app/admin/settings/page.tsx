import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card } from "@/components/admin/admin-ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireSettingsAccess } from "@/lib/admin/access";
import { listSettings } from "@/lib/admin/settings-reads";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

/**
 * Settings.
 *
 * Owner only, and not because managers cannot be trusted with a phone number.
 * The delivery charges on this page decide what every customer in the country
 * pays, and the free-delivery threshold decides which orders earn nothing —
 * that is the shop's economics, and it belongs to whoever owns the shop.
 */
export default async function AdminSettingsPage() {
  await requireSettingsAccess();
  const groups = await listSettings();

  return (
    <AdminPage
      title="Settings"
      lead="Your shop's name, contact details and delivery charges."
    >
      <SettingsForm groups={groups} />

      <Card className="mt-5 max-w-2xl p-4">
        <h2 className="text-[14px] font-semibold">Where these appear</h2>
        <p className="mt-1.5 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
          The delivery charges are quoted on the homepage, on every product
          page, in the cart and at checkout — and they are what an order is
          actually charged, so changing one changes the price of every order
          placed afterwards. Orders already placed keep the charge they were
          given. Your phone number is the footer link, the contact page and the
          WhatsApp button.
        </p>
      </Card>
    </AdminPage>
  );
}
