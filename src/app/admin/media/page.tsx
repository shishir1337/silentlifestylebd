import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { MediaLibrary } from "@/components/admin/media-library";
import { requireCatalogAccess } from "@/lib/admin/access";
import { listAssets } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Media · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminMediaPage() {
  const staff = await requireCatalogAccess();
  const assets = await listAssets();

  return (
    <AdminShell
      staff={staff}
      title="Media"
      lead="Every picture on the shop. Uploads go straight to the image service, so they stay fast on a phone."
    >
      <MediaLibrary assets={assets} />
    </AdminShell>
  );
}
