import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";
import { AdminPage } from "@/components/admin/admin-shell";
import { FilterBar } from "@/components/admin/filter-bar";
import { OrderTable } from "@/components/admin/order-table";
import { Pagination } from "@/components/admin/pagination";
import { requireStaff } from "@/lib/dal";
import {
  listOrders,
  ORDER_PER_PAGE,
  type DateRange,
  type OrderSort,
} from "@/lib/admin/order-reads";
import { ORDER_STATUS } from "@/lib/order-status";
import type { DeliveryArea } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

/** Only the statuses worth a chip. Every one is a real place an order sits. */
const CHIP_ORDER: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ON_HOLD",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The order queue.
 *
 * Every filter is read from the URL, so a view is shareable, survives a
 * refresh and behaves under the back button — and the page stays server
 * rendered, which is where the rows are. Filtering and paging happen in
 * Postgres, not in memory: orders only accumulate.
 *
 * Any staff role reaches this. Confirming and dispatching parcels is precisely
 * what a Staff account exists for.
 */
export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const staff = await requireStaff();
  const sp = await props.searchParams;

  const query = {
    q: one(sp.q),
    status: (one(sp.status) ?? "all") as OrderStatus | "all",
    range: (one(sp.range) ?? "all") as DateRange,
    area: (one(sp.area) ?? "all") as DeliveryArea | "all",
    sort: (one(sp.sort) ?? "newest") as OrderSort,
    page: Number(one(sp.page) ?? 1) || 1,
  };

  const { rows, total, page, pages, statusCounts } = await listOrders(query);
  const filtered = Boolean(
    query.q || query.status !== "all" || query.range !== "all" || query.area !== "all",
  );

  return (
    <AdminPage
      title="Orders"
      lead={
        statusCounts.PENDING
          ? `${statusCounts.PENDING} waiting to be confirmed. Call the customer, then mark it confirmed.`
          : "Everything is confirmed. Nothing is waiting on a phone call."
      }
      dense
    >
      <FilterBar
        searchPlaceholder="Order number, name or phone…"
        chipName="status"
        chips={[
          { value: "all", label: "All", count: statusCounts.all },
          ...CHIP_ORDER.filter((s) => statusCounts[s] > 0 || s === "PENDING").map((s) => ({
            value: s,
            // The same staff word the chips in the rows use, so filtering by
            // "Pending" and reading "Pending" are obviously the same thing.
            label: ORDER_STATUS[s].short,
            count: statusCounts[s] ?? 0,
          })),
        ]}
        selects={[
          {
            name: "range",
            label: "Date range",
            options: [
              { value: "all", label: "Any time" },
              { value: "today", label: "Today" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
            ],
          },
          {
            name: "area",
            label: "Delivery area",
            options: [
              { value: "all", label: "Anywhere" },
              { value: "inside-dhaka", label: "Inside Dhaka" },
              { value: "outside-dhaka", label: "Outside Dhaka" },
            ],
          },
          {
            name: "sort",
            label: "Sort",
            options: [
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "highest", label: "Highest value" },
            ],
          },
        ]}
      />

      <div className="mt-3">
        <OrderTable
          rows={rows}
          filtered={filtered}
          role={staff.role}
          /*
            One clock for the whole page. Every row's "2h ago" is measured from
            this, so they agree with each other and with the server that
            rendered them — a relative time computed per row in the browser is
            the classic hydration mismatch.
          */
          now={Date.now()}
        />
        <Pagination
          page={page}
          pages={pages}
          total={total}
          perPage={ORDER_PER_PAGE}
          noun="orders"
        />
      </div>
    </AdminPage>
  );
}
