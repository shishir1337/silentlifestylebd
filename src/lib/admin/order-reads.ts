import "server-only";

import { Prisma, type OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { DeliveryArea } from "@/lib/orders";

/**
 * Order reads for the admin panel.
 *
 * Filtering, sorting and paging all happen in Postgres. The catalogue reads
 * get away with loading everything and filtering in memory because there are
 * sixteen products; orders only go one way, and a list that loads every order
 * ever placed is the first thing that will break — quietly, a year from now,
 * on the client's phone.
 */

export const ORDER_PER_PAGE = 25;

export type OrderSort = "newest" | "oldest" | "highest";
export type DateRange = "all" | "today" | "7d" | "30d";

export interface OrderQuery {
  q?: string;
  status?: OrderStatus | "all";
  range?: DateRange;
  area?: DeliveryArea | "all";
  sort?: OrderSort;
  page?: number;
}

export interface AdminOrderRow {
  id: string;
  orderNo: string;
  status: OrderStatus;
  placedAt: string;
  customerName: string;
  customerPhone: string;
  area: DeliveryArea;
  total: number;
  itemCount: number;
  hasAccount: boolean;
  /** Placed over a day ago and still unconfirmed — the thing to chase. */
  overdue: boolean;
}

export interface OrderListResult {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pages: number;
  /** Counts per status for the filter chips, ignoring the status filter itself. */
  statusCounts: Record<OrderStatus | "all", number>;
}

const DAY = 24 * 60 * 60 * 1000;

function since(range: DateRange): Date | undefined {
  const now = new Date();
  switch (range) {
    case "today": {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      return midnight;
    }
    case "7d":
      return new Date(now.getTime() - 7 * DAY);
    case "30d":
      return new Date(now.getTime() - 30 * DAY);
    default:
      return undefined;
  }
}

/**
 * The `where` shared by the rows and the counts.
 *
 * `status` is deliberately excluded: the filter chips show how many orders are
 * in each status *within the current search and date range*, so switching
 * status must not change the numbers on the chips.
 */
function baseWhere(query: OrderQuery): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { orderNo: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      // Phone is how a Bangladeshi shop identifies anyone, so it is searched
      // with the punctuation stripped — people type it back with spaces.
      { customerPhone: { contains: q.replace(/[\s-]/g, "") } },
    ];
  }

  const from = since(query.range ?? "all");
  if (from) where.placedAt = { gte: from };

  if (query.area && query.area !== "all") {
    where.area = query.area === "inside-dhaka" ? "INSIDE_DHAKA" : "OUTSIDE_DHAKA";
  }

  return where;
}

const ORDER_BY: Record<OrderSort, Prisma.OrderOrderByWithRelationInput> = {
  newest: { placedAt: "desc" },
  oldest: { placedAt: "asc" },
  highest: { total: "desc" },
};

export async function listOrders(query: OrderQuery): Promise<OrderListResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const base = baseWhere(query);
  const where: Prisma.OrderWhereInput =
    query.status && query.status !== "all" ? { ...base, status: query.status } : base;

  const [rows, total, grouped] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: ORDER_BY[query.sort ?? "newest"],
      skip: (page - 1) * ORDER_PER_PAGE,
      take: ORDER_PER_PAGE,
      select: {
        id: true,
        orderNo: true,
        status: true,
        placedAt: true,
        customerName: true,
        customerPhone: true,
        customerId: true,
        area: true,
        total: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
  ]);

  const statusCounts = { all: 0 } as Record<OrderStatus | "all", number>;
  for (const g of grouped) {
    statusCounts[g.status] = g._count._all;
    statusCounts.all += g._count._all;
  }

  const yesterday = new Date(Date.now() - DAY);

  return {
    rows: rows.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      placedAt: o.placedAt.toISOString(),
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      area: o.area === "INSIDE_DHAKA" ? "inside-dhaka" : "outside-dhaka",
      total: o.total,
      itemCount: o._count.items,
      hasAccount: o.customerId !== null,
      overdue: o.status === "PENDING" && o.placedAt < yesterday,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ORDER_PER_PAGE)),
    statusCounts,
  };
}

export interface AdminOrderDetail {
  id: string;
  orderNo: string;
  status: OrderStatus;
  placedAt: string;
  customerName: string;
  customerPhone: string;
  altPhone: string | null;
  address: string;
  note: string | null;
  area: DeliveryArea;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  account: { name: string; email: string } | null;
  items: {
    name: string;
    slug: string;
    size: string | null;
    unitPrice: number;
    qty: number;
    imageUrl: string;
  }[];
  events: {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus | null;
    note: string | null;
    actor: string | null;
    createdAt: string;
  }[];
}

export async function getOrder(orderNo: string): Promise<AdminOrderDetail | null> {
  const o = await db.order.findUnique({
    where: { orderNo },
    select: {
      id: true,
      orderNo: true,
      status: true,
      placedAt: true,
      customerName: true,
      customerPhone: true,
      altPhone: true,
      address: true,
      note: true,
      area: true,
      subtotal: true,
      deliveryCharge: true,
      total: true,
      customer: { select: { name: true, email: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          name: true,
          slug: true,
          size: true,
          unitPrice: true,
          qty: true,
          imageUrl: true,
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
    },
  });
  if (!o) return null;

  return {
    id: o.id,
    orderNo: o.orderNo,
    status: o.status,
    placedAt: o.placedAt.toISOString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    altPhone: o.altPhone,
    address: o.address,
    note: o.note,
    area: o.area === "INSIDE_DHAKA" ? "inside-dhaka" : "outside-dhaka",
    subtotal: o.subtotal,
    deliveryCharge: o.deliveryCharge,
    total: o.total,
    account: o.customer,
    items: o.items,
    events: o.events.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      note: e.note,
      actor: e.actor?.name ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
