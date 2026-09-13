import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { requireCatalogAccess } from "@/lib/admin/access";
import { getProduct, listAssets, listCategories } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Edit product · Admin",
  robots: { index: false, follow: false },
};

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const staff = await requireCatalogAccess();
  const { id } = await props.params;

  const [product, categories, assets] = await Promise.all([
    getProduct(id),
    listCategories(),
    listAssets(),
  ]);
  if (!product) notFound();

  return (
    <AdminPage
      title={product.name}
      lead="Changes show on the shop within a few seconds of saving."
    >
      <ProductForm
        product={product}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        assets={assets}
      />
    </AdminPage>
  );
}
