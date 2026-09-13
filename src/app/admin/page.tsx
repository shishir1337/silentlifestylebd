import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card, Pill, SectionTitle, Stat, EmptyState } from "@/components/admin/admin-ui";
import { AlertIcon } from "@/components/admin/admin-icons";
import { requireStaff } from "@/lib/dal";
import { getAdminCounts, getDashboardFeed } from "@/lib/admin/catalog-reads";
import { CAN_MANAGE_CATALOG, can } from "@/lib/admin/access";
import { ORDER_STATUS, STATUS_CHIP } from "@/lib/order-status";
import { formatOrderDate } from "@/lib/orders";
import { Taka } from "@/components/ui/price";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * The dashboard.
 *
 * Answers the three questions somebody opening this at 9am actually has: what
 * needs doing, what sold, and what is about to run out. Not a welcome screen —
 * an operator who has to read a paragraph before they can act has been handed a
 * brochure rather than a tool.
 *
 * Any staff role lands here, so it shows only what the signed-in role can act
 * on. Someone who can only touch orders should not be reading a catalogue
 * summary they cannot change.
 */
export default async function AdminOverviewPage() {
  const staff = await requireStaff();
  const catalog = can(staff.role, CAN_MANAGE_CATALOG);

  const [counts, feed] = await Promise.all([
    catalog ? getAdminCounts() : null,
    getDashboardFeed(),
  ]);

  return (
    <AdminPage
      title="Dashboard"
      lead={
        feed.pending > 0
          ? `${feed.pending} ${feed.pending === 1 ? "order needs" : "orders need"} confirming.`
          : "Nothing is waiting on you right now."
      }
    >
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="To confirm"
          value={feed.pending}
          hint="waiting on a phone call"
          tone={feed.pending > 0 ? "warn" : "neutral"}
          alarm={feed.pending > 0}
          href="/admin/orders"
        />
        <Stat
          label="Orders today"
          value={feed.ordersToday}
          hint={feed.ordersToday === 0 ? "none yet" : "since midnight"}
          href="/admin/orders"
        />
        <Stat
          label="Sales today"
          value={<Taka amount={feed.salesToday} />}
          hint="cash on delivery"
          tone={feed.salesToday > 0 ? "good" : "neutral"}
        />
        {catalog && counts ? (
          <Stat
            label="Out of stock"
            value={counts.outOfStock}
            hint="no size left"
            tone={counts.outOfStock > 0 ? "warn" : "neutral"}
            alarm={counts.outOfStock > 0}
            href="/admin/products"
          />
        ) : (
          <Stat label="Delivered" value={feed.delivered} hint="all time" />
        )}
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle
            action={
              <Link
                href="/admin/orders"
                className="text-[12px] font-medium text-brand underline underline-offset-2"
              >
                All orders
              </Link>
            }
          >
            Latest orders
          </SectionTitle>

          {feed.recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-ink-muted">
              No orders yet. They appear here the moment a customer places one.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {feed.recent.map((o) => (
                <li key={o.orderNo}>
                  {/*
                    Two rows on a phone, one on a desktop. Squeezing the order
                    number, the customer, a status chip and the total onto one
                    line at 390px broke the order number across two lines and
                    truncated the name to three characters — the two things
                    somebody scanning this list is actually looking for.
                  */}
                  <Link
                    href="/admin/orders"
                    className="block px-4 py-3 transition-colors duration-[var(--dur-base)] hover:bg-subtle"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="tabular text-[13px] font-semibold whitespace-nowrap">
                        {o.orderNo}
                      </span>
                      <Taka amount={o.total} className="shrink-0 text-[13px] font-semibold" />
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[12px] text-ink-muted">
                        {o.customerName} · {formatOrderDate(o.placedAt)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                          STATUS_CHIP[ORDER_STATUS[o.status].tone],
                        )}
                      >
                        {ORDER_STATUS[o.status].label}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          {catalog ? (
            <Card>
              <SectionTitle
                action={
                  <Link
                    href="/admin/products"
                    className="text-[12px] font-medium text-brand underline underline-offset-2"
                  >
                    Products
                  </Link>
                }
              >
                Running out
              </SectionTitle>

              {feed.lowStock.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-ink-muted">
                  Every size is in stock.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {feed.lowStock.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-[var(--dur-base)] hover:bg-subtle"
                      >
                        <AlertIcon
                          className={cn(
                            "size-4 shrink-0",
                            p.totalStock === 0 ? "text-sale" : "text-ink-muted",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
                        {p.totalStock === 0 ? (
                          <Pill tone="warn">Out</Pill>
                        ) : (
                          <span className="tabular shrink-0 text-[12px] text-ink-muted">
                            {p.totalStock} left
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {catalog && counts ? (
            <Card className="p-4">
              <h2 className="text-[14px] font-semibold">Catalogue</h2>
              <dl className="mt-3 space-y-2 text-[13px]">
                <Row label="On the shop" value={counts.products - counts.hidden} />
                <Row label="Hidden" value={counts.hidden} />
                <Row label="Categories" value={counts.categories} />
                <Row label="Pictures" value={counts.assets} />
              </dl>
              <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-muted">
                Anything you change reaches the shop within a few seconds. No
                developer, no deploy.
              </p>
            </Card>
          ) : (
            <EmptyState
              title="Orders are your section"
              body="Your account can confirm, pack and mark orders delivered. The catalogue and settings belong to the owner."
            />
          )}
        </div>
      </div>
    </AdminPage>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}
