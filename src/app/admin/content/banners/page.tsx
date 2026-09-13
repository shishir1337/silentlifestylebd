import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { BannerManager } from "@/components/admin/banner-manager";
import { requireContentAccess } from "@/lib/admin/access";
import { listHeroSlides } from "@/lib/admin/content-reads";
import { listAssets } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Banners",
  robots: { index: false, follow: false },
};

export default async function AdminBannerManagerPage() {
  await requireContentAccess();
  const [items, assets] = await Promise.all([listHeroSlides(), listAssets()]);

  return (
    <AdminPage title="Banners" lead="The pictures at the top of the homepage.">
      <BannerManager slides={items} assets={assets} />
    </AdminPage>
  );
}
