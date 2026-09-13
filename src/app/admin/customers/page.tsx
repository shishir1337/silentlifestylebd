import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { FilterBar } from "@/components/admin/filter-bar";
import { CustomerTable } from "@/components/admin/customer-table";
import { Pagination } from "@/components/admin/pagination";
import { requireStaff } from "@/lib/dal";
import {
  CUSTOMER_PER_PAGE,
  listCustomers,
  type CustomerSort,
} from "@/lib/admin/people-reads";

export const metadata: Metadata = {
  title: "Customers",
  robots: { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * People with accounts.
 *
 * Read-only, deliberately: a shop has no business quietly rewriting somebody's
 * name or email, and the support cases that genuinely need a change ("they
 * mistyped their address") belong on the order, where the edit is audited and
 * only affects that delivery.
 *
 * Guests are not here. They ordered without an account, and turning every
 * guest phone number into a customer record would build a marketing list out
 * of data given for one delivery. They remain fully visible on their orders.
 */
export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  await requireStaff();
  const sp = await props.searchParams;

  const query = {
    q: one(sp.q),
    sort: (one(sp.sort) ?? "recent") as CustomerSort,
    page: Number(one(sp.page) ?? 1) || 1,
  };

  const { rows, total, page, pages } = await listCustomers(query);

  return (
    <AdminPage
      title="Customers"
      lead="Shoppers who created an account. Guests appear on their own orders instead."
    >
      <FilterBar
        searchPlaceholder="Name, email or phone…"
        selects={[
          {
            name: "sort",
            label: "Sort",
            options: [
              { value: "recent", label: "Newest first" },
              { value: "name", label: "Name A–Z" },
              { value: "spend", label: "Biggest spend (this page)" },
              { value: "orders", label: "Most orders (this page)" },
            ],
          },
        ]}
      />

      <div className="mt-4">
        <CustomerTable rows={rows} filtered={Boolean(query.q)} />
        <Pagination
          page={page}
          pages={pages}
          total={total}
          perPage={CUSTOMER_PER_PAGE}
          noun="customers"
        />
      </div>
    </AdminPage>
  );
}
