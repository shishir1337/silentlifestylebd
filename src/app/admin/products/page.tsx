import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { FilterBar } from "@/components/admin/filter-bar";
import { ProductList } from "@/components/admin/product-list";
import { Pagination } from "@/components/admin/pagination";
import { ButtonLink } from "@/components/ui/button";
import { requireCatalogAccess } from "@/lib/admin/access";
import {
  listCategories,
  listProducts,
  PRODUCT_PER_PAGE,
  type ProductSort,
  type StockFilter,
} from "@/lib/admin/catalog-reads";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The catalogue.
 *
 * Same shape as the order queue: filters in the URL, work done in Postgres,
 * paging that keeps the filters. The difference is what an operator comes here
 * to do — which is usually not "browse", but "find the thing that has run out
 * and put a number in".
 */
export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const staff = await requireCatalogAccess();
  const sp = await props.searchParams;

  const query = {
    q: one(sp.q),
    category: one(sp.category) ?? "all",
    status: (one(sp.status) ?? "all") as "all" | "live" | "hidden",
    stock: (one(sp.stock) ?? "all") as StockFilter,
    sort: one(sp.sort) as ProductSort | undefined,
    page: Number(one(sp.page) ?? 1) || 1,
  };

  const [{ rows, total, page, pages }, categories] = await Promise.all([
    listProducts(query),
    listCategories(),
  ]);

  const filtered = Boolean(
    query.q ||
      query.category !== "all" ||
      query.status !== "all" ||
      query.stock !== "all",
  );

  return (
    <AdminPage
      title="Products"
      lead="Prices, stock and descriptions. Hidden products stay in your records but disappear from the shop."
      action={<ButtonLink href="/admin/products/new">Add product</ButtonLink>}
    >
      <FilterBar
        searchPlaceholder="Name or product code…"
        chipName="stock"
        chips={[
          { value: "all", label: "All stock" },
          { value: "out", label: "Out of stock" },
          { value: "low", label: "Running low" },
        ]}
        selects={[
          {
            name: "category",
            label: "Category",
            options: [
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c.slug, label: c.name })),
            ],
          },
          {
            name: "status",
            label: "Status",
            options: [
              { value: "all", label: "Live and hidden" },
              { value: "live", label: "On the shop" },
              { value: "hidden", label: "Hidden" },
            ],
          },
          {
            name: "sort",
            label: "Sort",
            options: [
              { value: "all", label: "Shop order" },
              { value: "name", label: "Name A–Z" },
              { value: "price-desc", label: "Most expensive" },
              { value: "price-asc", label: "Cheapest" },
              { value: "stock", label: "Least stock (this page)" },
            ],
          },
        ]}
      />

      <div className="mt-4">
        <ProductList rows={rows} filtered={filtered} />
        <Pagination
          page={page}
          pages={pages}
          total={total}
          perPage={PRODUCT_PER_PAGE}
          noun="products"
        />
      </div>
    </AdminPage>
  );
}
