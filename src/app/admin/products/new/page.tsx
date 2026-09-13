import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { requireCatalogAccess } from "@/lib/admin/access";
import { listAssets, listCategories } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Add product · Admin",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const staff = await requireCatalogAccess();
  const [categories, assets] = await Promise.all([listCategories(), listAssets()]);

  return (
    <AdminShell
      staff={staff}
      title="Add product"
      lead="It appears on the shop as soon as you save, unless you untick “Show on the shop”."
    >
      <ProductForm
        product={null}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        assets={assets}
      />
    </AdminShell>
  );
}
