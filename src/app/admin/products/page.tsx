import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductList } from "@/components/admin/product-list";
import { ButtonLink } from "@/components/ui/button";
import { requireCatalogAccess } from "@/lib/admin/access";
import { listProducts } from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Products · Admin",
  robots: { index: false, follow: false },
};

/**
 * Product list.
 *
 * Dynamic, and reading the database directly rather than the cached storefront
 * layer — an operator who changes a price and is shown the old one cannot tell
 * a stale cache from a failed save, and will change it again.
 *
 * Search is a plain form submitting `?q=`, not a client filter. It is a server
 * query against name, code and web address, so it keeps working when the
 * catalogue is larger than one page.
 */
export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const staff = await requireCatalogAccess();
  const { q } = await props.searchParams;
  const query = Array.isArray(q) ? q[0] : q;
  const products = await listProducts(query);

  return (
    <AdminShell
      staff={staff}
      title="Products"
      lead="Prices, stock and descriptions. Hidden products stay in your records but disappear from the shop."
      action={
        <ButtonLink href="/admin/products/new" size="md">
          Add product
        </ButtonLink>
      }
    >
      <ProductList products={products} query={query ?? ""} />
    </AdminShell>
  );
}
