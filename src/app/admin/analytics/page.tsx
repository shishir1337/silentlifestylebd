import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card } from "@/components/admin/admin-ui";
import { ColumnChart, RankedBars, SeriesTable, SplitBar } from "@/components/admin/charts";
import { requireCatalogAccess } from "@/lib/admin/access";
import { getAnalytics, change, RANGES, type Range } from "@/lib/admin/analytics";
import { ORDER_STATUS } from "@/lib/order-status";
import { formatBDT } from "@/lib/currency";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

/**
 * What the shop is actually doing.
 *
 * Built around one fact that most dashboards get wrong for this kind of shop:
 * an order placed is not money. Cash on delivery in Bangladesh loses a serious
 * share of orders at the door, and a shop that reads "revenue" as the value of
 * orders placed will restock against sales it never made.
 *
 * So the page leads with the three that matter — collected, still open, lost —
 * and with the fulfilment rate, which is the number that tells a COD shop
 * whether its problem is traffic or its phone calls.
 */
export default async function AdminAnalyticsPage(
  props: PageProps<"/admin/analytics">,
) {
  await requireCatalogAccess();
  const sp = await props.searchParams;
  const rangeParam = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const range = (RANGES.find((r) => r.value === rangeParam)?.value ?? "30d") as Range;

  const a = await getAnalytics(range);

  const collectedChange = change(a.collected.value, a.previous.collected.value);
  const ordersChange = change(a.placed.orders, a.previous.placed.orders);

  return (
    <AdminPage
      title="Analytics"
      lead="Money collected, not orders placed — the two are not the same in a cash-on-delivery shop."
      dense
    >
      {/* --------------------------------------------------------- range */}
      <nav aria-label="Date range" className="mb-4">
        <ul className="rail rail-bleed gap-1.5 sm:flex sm:flex-wrap sm:overflow-visible">
          {RANGES.map((r) => (
            <li key={r.value}>
              <Link
                href={`/admin/analytics?range=${r.value}`}
                aria-current={r.value === range ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap",
                  "transition-colors duration-[var(--dur-base)]",
                  r.value === range
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-canvas text-ink-soft hover:border-ink hover:text-ink",
                )}
              >
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ------------------------------------------------------- headline */}
      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
        <Figure
          label="Collected"
          value={formatBDT(a.collected.value)}
          sub={`${a.collected.orders} delivered`}
          delta={collectedChange}
          tone="good"
          note="Delivered and paid for. The real number."
        />
        <Figure
          label="Still open"
          value={formatBDT(a.open.value)}
          sub={`${a.open.orders} on the way`}
          note="Placed and still moving. Some of this will not arrive."
        />
        <Figure
          label="Lost"
          value={formatBDT(a.lost.value)}
          sub={`${a.lost.orders} cancelled or returned`}
          tone={a.lost.orders > 0 ? "bad" : undefined}
          note="Refused at the door, cancelled, or sent back."
        />
        <Figure
          label="Fulfilment"
          value={a.fulfilmentRate === null ? "—" : `${Math.round(a.fulfilmentRate)}%`}
          sub="of finished orders"
          tone={a.fulfilmentRate !== null && a.fulfilmentRate < 75 ? "bad" : "good"}
          note="Delivered, out of everything that reached an end. Below about 75% is a phone-call problem, not a traffic one."
        />
      </div>

      {/* ---------------------------------------------------------- trend */}
      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Orders over time</h2>
          <p className="text-[12.5px] text-ink-muted">
            {a.placed.orders} placed
            {ordersChange !== null ? (
              <span className={cn("ml-2 font-medium", ordersChange >= 0 ? "text-brand" : "text-sale")}>
                {ordersChange >= 0 ? "+" : ""}
                {Math.round(ordersChange)}% on the period before
              </span>
            ) : null}
          </p>
        </div>
        <div className="mt-4">
          <ColumnChart points={a.series} title="Orders placed and collected over time" />
          <SeriesTable points={a.series} />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        {/* ------------------------------------------------ what sold */}
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Best sellers</h2>
          <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-ink-muted">
            By value of goods actually delivered. A product that is ordered
            constantly and refused at the door is a returns problem, not a best
            seller, and ranking it here would send you to restock it.
          </p>
          <RankedBars rows={a.topProducts} empty="Nothing delivered in this period yet." />
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Categories</h2>
          <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-ink-muted">
            Where the money came from, by the same measure.
          </p>
          <RankedBars rows={a.topCategories} empty="Nothing delivered in this period yet." />
        </Card>

        {/* --------------------------------------------------- where */}
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Where they are</h2>
          <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-ink-muted">
            Inside Dhaka and outside cost you different amounts to deliver and
            fail at different rates.
          </p>
          <SplitBar
            parts={[
              { label: "Inside Dhaka", value: a.area.insideDhaka.orders, className: "bg-brand" },
              {
                label: "Outside Dhaka",
                value: a.area.outsideDhaka.orders,
                className: "bg-[var(--color-hold)]",
              },
            ]}
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[13px]">
            <div>
              <dt className="text-ink-muted">Dhaka</dt>
              <dd className="tabular font-semibold">{formatBDT(a.area.insideDhaka.value)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Outside</dt>
              <dd className="tabular font-semibold">{formatBDT(a.area.outsideDhaka.value)}</dd>
            </div>
          </dl>
        </Card>

        {/* --------------------------------------------------- status */}
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Where the orders are</h2>
          <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-ink-muted">
            Everything placed in this period, by where it sits now.
          </p>
          <ul className="space-y-1.5">
            {a.statusCounts.map((s) => {
              const max = Math.max(...a.statusCounts.map((x) => x.count), 1);
              return (
                <li key={s.status} className="flex items-center gap-3 text-[13px]">
                  <span className="w-32 shrink-0 truncate">
                    {ORDER_STATUS[s.status as keyof typeof ORDER_STATUS]?.short ?? s.status}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-ink"
                      style={{ width: `${(s.count / max) * 100}%` }}
                    />
                  </span>
                  <span className="tabular w-8 shrink-0 text-right font-medium">{s.count}</span>
                </li>
              );
            })}
            {a.statusCounts.length === 0 ? (
              <li className="py-4 text-center text-[13px] text-ink-muted">
                No orders in this period.
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      {/* ------------------------------------------------------- the rest */}
      <div className="mt-4 grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
        <Figure
          label="Average order"
          value={a.averageOrder === null ? "—" : formatBDT(a.averageOrder)}
          sub="per delivered order"
          note="Averaged over collected orders only, so it is what a sale is worth rather than what one was hoped to be."
        />
        <Figure
          label="Customers"
          value={String(a.customers.total)}
          sub={`${a.customers.returning} ordered more than once`}
          note="Counted by phone number, because most orders here are guests."
        />
        <Figure
          label="Discounts given"
          value={formatBDT(a.discountGiven)}
          sub="across all orders"
          note="What discount codes took off. Free-delivery codes waive the charge instead and are not counted here."
        />
      </div>
    </AdminPage>
  );
}

/** One number, what it means, and whether it moved. */
function Figure({
  label,
  value,
  sub,
  delta,
  tone,
  note,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  tone?: "good" | "bad";
  note?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-[11.5px] font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1.5 text-[24px] leading-none font-bold tracking-[-0.02em]",
          tone === "good" && "text-brand",
          tone === "bad" && "text-sale",
        )}
      >
        {value}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        {sub ? <span className="text-[12.5px] text-ink-soft">{sub}</span> : null}
        {delta !== null && delta !== undefined ? (
          <span
            className={cn(
              "tabular text-[12px] font-medium",
              delta >= 0 ? "text-brand" : "text-sale",
            )}
          >
            {delta >= 0 ? "+" : ""}
            {Math.round(delta)}%
          </span>
        ) : null}
      </div>
      {note ? (
        <p className="mt-2 text-[11.5px] leading-snug text-ink-muted">{note}</p>
      ) : null}
    </Card>
  );
}
