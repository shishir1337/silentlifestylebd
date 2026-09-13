import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { NavManager } from "@/components/admin/nav-manager";
import { requireContentAccess } from "@/lib/admin/access";
import { listLinkTargets, listNavItems } from "@/lib/admin/content-reads";

export const metadata: Metadata = {
  title: "Menus",
  robots: { index: false, follow: false },
};

export default async function AdminNavigationPage() {
  await requireContentAccess();
  const [items, targets] = await Promise.all([listNavItems(), listLinkTargets()]);

  return (
    <AdminPage
      title="Menus"
      lead="The links at the top of the shop and in the footer."
    >
      <NavManager items={items} targets={targets} />
    </AdminPage>
  );
}
