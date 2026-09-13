import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { CollectionManager } from "@/components/admin/collection-manager";
import { requireCatalogAccess } from "@/lib/admin/access";
import { listCollections } from "@/lib/admin/people-reads";
import { listCategories } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Collections",
  robots: { index: false, follow: false },
};

/**
 * The curated sets the shop's navigation links to.
 *
 * Not the same thing as categories. A category is where a product lives; a
 * collection is a way of grouping several of them for a shopper — "Men",
 * "Accessories", "New In". They overlap deliberately: watches belong to both
 * Men and Accessories, which is why the membership is a join table rather than
 * a column on the category.
 */
export default async function AdminCollectionsPage() {
  await requireCatalogAccess();
  const [collections, categories] = await Promise.all([
    listCollections(),
    listCategories(),
  ]);

  return (
    <AdminPage
      title="Collections"
      lead="The groups in your menu. Some you choose, some fill themselves from what a product is."
    >
      <CollectionManager collections={collections} categories={categories} />
    </AdminPage>
  );
}
