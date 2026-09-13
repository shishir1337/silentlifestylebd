import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { TileManager } from "@/components/admin/tile-manager";
import { requireContentAccess } from "@/lib/admin/access";
import { listPromoTiles } from "@/lib/admin/content-reads";
import { listAssets } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Tiles",
  robots: { index: false, follow: false },
};

export default async function AdminTileManagerPage() {
  await requireContentAccess();
  const [items, assets] = await Promise.all([listPromoTiles(), listAssets()]);

  return (
    <AdminPage title="Tiles" lead="The two panels under your bestsellers.">
      <TileManager tiles={items} assets={assets} />
    </AdminPage>
  );
}
