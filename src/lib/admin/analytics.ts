import "server-only";

import { db } from "@/lib/db";

/**
 * The numbers, for a shop that is paid on delivery.
 *
 * Most dashboards report "revenue" as the value of orders placed. For a
 * cash-on-delivery shop in Bangladesh that number is a fiction: a fifth to a
 * third of orders are refused at the door, cancelled on the phone, or sent
 * back. A shop that plans against orders placed is planning against money it
 * will not see.
 *
 * So every figure here says which of three things it is:
 *
 *   collected  delivered, and the money is in. The real number.
 *   open       placed and still moving. Money that might arrive.
 *   lost       cancelled or returned. Money that will not.
 *
 * The fulfilment rate — collected as a share of everything that has finished —
 * is the single most actionable figure a COD shop has, and it is the one a
 * generic dashboard does not show.
 */

export type Range = "7d" | "30d" | "90d" | "12m";

export const RANGES: { value: Range; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "12m", label: "Last 12 months", days: 365 },
];

const LOST = ["CANCELLED", "RETURNED"] as const;

export interface Money {
  orders: number;
  value: number;
}

export interface AnalyticsPoint {
  /** `YYYY-MM-DD`, or `YYYY-MM` when the range is bucketed by month. */
  bucket: string;
  label: string;
  orders: number;
  collected: number;
  placed: number;
}

export interface TopRow {
  name: string;
  slug: string | null;
  units: number;
  value: number;
}

export interface Analytics {
  range: Range;
  from: Date;
  to: Date;
  /** Everything placed in the window, whatever became of it. */
  placed: Money;
  collected: Money;
  open: Money;
  lost: Money;
  /** Collected ÷ (collected + lost), as a percentage of finished orders. */
  fulfilmentRate: number | null;
  /** Average value of a *collected* order — what a sale is actually worth. */
  averageOrder: number | null;
  discountGiven: number;
  /** The same figures for the window before this one, for comparison. */
  previous: { placed: Money; collected: Money; lost: Money };
  series: AnalyticsPoint[];
  topProducts: TopRow[];
  topCategories: TopRow[];
  area: { insideDhaka: Money; outsideDhaka: Money };
  customers: { total: number; returning: number };
  statusCounts: { status: string; count: number }[];
}

const empty = (): Money => ({ orders: 0, value: 0 });

export async function getAnalytics(range: Range): Promise<Analytics> {
  const days = RANGES.find((r) => r.value === range)?.days ?? 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  // The window immediately before this one, the same length, so "up 12%" is
  // measured against a like period rather than against everything ever.
  const prevFrom = new Date(from.getTime() - days * 86_400_000);

  const byMonth = days > 120;

  const [current, previousRows, items, areaRows, phones, statuses] = await Promise.all([
    db.order.findMany({
      where: { placedAt: { gte: from, lte: to } },
      select: { placedAt: true, status: true, total: true, discount: true, area: true },
    }),
    db.order.findMany({
      where: { placedAt: { gte: prevFrom, lt: from } },
      select: { status: true, total: true },
    }),
    /*
      Line items rather than orders, because "top product" is a question about
      units. Restricted to orders that were actually delivered: a product that
      is ordered constantly and refused at the door is not a top seller, it is
      a returns problem, and ranking it first sends the shop to restock it.
    */
    db.orderItem.findMany({
      where: { order: { placedAt: { gte: from, lte: to }, status: "DELIVERED" } },
      select: {
        name: true,
        qty: true,
        unitPrice: true,
        product: { select: { slug: true, category: { select: { name: true, slug: true } } } },
      },
    }),
    db.order.groupBy({
      by: ["area", "status"],
      where: { placedAt: { gte: from, lte: to } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.order.groupBy({
      by: ["customerPhone"],
      where: { placedAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    db.order.groupBy({
      by: ["status"],
      where: { placedAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
  ]);

  /* --- the three buckets ------------------------------------------------- */

  const placed = empty();
  const collected = empty();
  const open = empty();
  const lost = empty();
  let discountGiven = 0;

  for (const o of current) {
    placed.orders += 1;
    placed.value += o.total;
    discountGiven += o.discount;

    const bucket =
      o.status === "DELIVERED" ? collected : LOST.includes(o.status as never) ? lost : open;
    bucket.orders += 1;
    bucket.value += o.total;
  }

  const prev = { placed: empty(), collected: empty(), lost: empty() };
  for (const o of previousRows) {
    prev.placed.orders += 1;
    prev.placed.value += o.total;
    if (o.status === "DELIVERED") {
      prev.collected.orders += 1;
      prev.collected.value += o.total;
    } else if (LOST.includes(o.status as never)) {
      prev.lost.orders += 1;
      prev.lost.value += o.total;
    }
  }

  const finished = collected.orders + lost.orders;
  const fulfilmentRate = finished > 0 ? (collected.orders / finished) * 100 : null;
  const averageOrder =
    collected.orders > 0 ? Math.round(collected.value / collected.orders) : null;

  /* --- over time ---------------------------------------------------------- */

  const buckets = new Map<string, AnalyticsPoint>();
  const key = (d: Date) =>
    byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : d.toISOString().slice(0, 10);

  // Seed every bucket, so a day with no orders is a gap in the chart rather
  // than a missing column that quietly compresses the timeline.
  const cursor = new Date(from);
  while (cursor <= to) {
    const k = key(cursor);
    if (!buckets.has(k)) {
      buckets.set(k, { bucket: k, label: labelFor(cursor, byMonth), orders: 0, collected: 0, placed: 0 });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const o of current) {
    const point = buckets.get(key(o.placedAt));
    if (!point) continue;
    point.orders += 1;
    point.placed += o.total;
    if (o.status === "DELIVERED") point.collected += o.total;
  }

  /* --- what sold ---------------------------------------------------------- */

  const products = new Map<string, TopRow>();
  const categories = new Map<string, TopRow>();

  for (const item of items) {
    const value = item.unitPrice * item.qty;

    const p = products.get(item.name) ?? {
      name: item.name,
      slug: item.product?.slug ?? null,
      units: 0,
      value: 0,
    };
    p.units += item.qty;
    p.value += value;
    products.set(item.name, p);

    const categoryName = item.product?.category?.name;
    if (categoryName) {
      const c = categories.get(categoryName) ?? {
        name: categoryName,
        slug: item.product?.category?.slug ?? null,
        units: 0,
        value: 0,
      };
      c.units += item.qty;
      c.value += value;
      categories.set(categoryName, c);
    }
  }

  const byValue = (a: TopRow, b: TopRow) => b.value - a.value;

  /* --- where, and who ----------------------------------------------------- */

  const area = { insideDhaka: empty(), outsideDhaka: empty() };
  for (const row of areaRows) {
    const bucket = row.area === "INSIDE_DHAKA" ? area.insideDhaka : area.outsideDhaka;
    bucket.orders += row._count._all;
    bucket.value += row._sum.total ?? 0;
  }

  /*
    "Returning" means this phone number ordered more than once inside the
    window. Phone rather than account, because most of these customers never
    create one — counting only account holders would report a loyal shop as
    having almost no repeat business.
  */
  const customers = {
    total: phones.length,
    returning: phones.filter((p) => p._count._all > 1).length,
  };

  return {
    range,
    from,
    to,
    placed,
    collected,
    open,
    lost,
    fulfilmentRate,
    averageOrder,
    discountGiven,
    previous: prev,
    series: [...buckets.values()],
    topProducts: [...products.values()].sort(byValue).slice(0, 8),
    topCategories: [...categories.values()].sort(byValue).slice(0, 6),
    area,
    customers,
    statusCounts: statuses
      .map((s) => ({ status: s.status, count: s._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}

function labelFor(d: Date, byMonth: boolean): string {
  return byMonth
    ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Percentage change, or null when there is nothing to compare against. */
export function change(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return ((now - before) / before) * 100;
}
