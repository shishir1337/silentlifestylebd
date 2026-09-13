import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { CategoryManager } from "@/components/admin/category-manager";
import { requireCatalogAccess } from "@/lib/admin/access";
import { listAssets, listCategories } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Categories · Admin",
  robots: { index: false, follow: false },
};

/**
 * Categories.
 *
 * Order matters here in a way it does not for products: this list is the order
 * of the rail under the homepage hero, which is the most-tapped element on a
 * phone. So reordering is a first-class action rather than a hidden field.
 */
export default async function AdminCategoriesPage() {
  const staff = await requireCatalogAccess();
  const [categories, assets] = await Promise.all([listCategories(), listAssets()]);

  return (
    <AdminShell
      staff={staff}
      title="Categories"
      lead="The order here is the order customers see on the homepage."
    >
      <CategoryManager categories={categories} assets={assets} />
    </AdminShell>
  );
}
