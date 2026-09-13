import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { DeliveryArea } from "@/lib/orders";
import type { OrderStatusView } from "@/lib/order-reads";

/**
 * Customers and collections, for the admin panel.
 *
 * ## Who counts as a customer
 *
 * People with an account, and nobody else. A guest who ordered once is a name
 * on an order, not a record in a customer list — turning every guest phone
 * number into a row would build a marketing contact list the shop never asked
 * for, out of data given for one delivery, and would be a liability the day
 * anybody asked what it was for.
 *
 * Guests are entirely visible: they are on their orders, searchable by phone,
 * with their address and history. What they are not is *collected*.
 */

export const CUSTOMER_PER_PAGE = 25;

export type CustomerSort = "recent" | "spend" | "orders" | "name";

export interface CustomerQuery {
  q?: string;
  sort?: CustomerSort;
  page?: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  isStaff: boolean;
}

export async function listCustomers(query: CustomerQuery = {}) {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const q = query.q?.trim();

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q.replace(/[\s-]/g, "") } },
    ];
  }

  /**
   * Spend and order count are aggregates over a relation, which Prisma cannot
   * sort by. Rather than pretend, those two sorts order the page that has been
   * fetched and the label says so. "Newest" and "Name" are real database
   * sorts and are the ones a growing list actually needs.
   */
  const orderBy: Prisma.UserOrderByWithRelationInput =
    query.sort === "name" ? { name: "asc" } : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * CUSTOMER_PER_PAGE,
      take: CUSTOMER_PER_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        staffRole: true,
        orders: {
          select: { total: true, placedAt: true, status: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const mapped: CustomerRow[] = rows.map((u) => {
    // Cancelled and returned orders are not money the shop kept, so they do
    // not count towards what somebody has spent.
    const counted = u.orders.filter(
      (o) => o.status !== "CANCELLED" && o.status !== "RETURNED",
    );
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      joinedAt: u.createdAt.toISOString(),
      orderCount: u.orders.length,
      totalSpent: counted.reduce((n, o) => n + o.total, 0),
      lastOrderAt:
        u.orders.length > 0
          ? u.orders
              .map((o) => o.placedAt)
              .sort((a, b) => b.getTime() - a.getTime())[0]
              .toISOString()
          : null,
      isStaff: u.staffRole !== null,
    };
  });

  if (query.sort === "spend") mapped.sort((a, b) => b.totalSpent - a.totalSpent);
  if (query.sort === "orders") mapped.sort((a, b) => b.orderCount - a.orderCount);

  return {
    rows: mapped,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / CUSTOMER_PER_PAGE)),
  };
}

export interface CustomerDetail extends CustomerRow {
  addresses: {
    id: string;
    label: string;
    recipient: string;
    phone: string;
    address: string;
    area: DeliveryArea;
    isDefault: boolean;
  }[];
  orders: {
    orderNo: string;
    status: OrderStatusView;
    placedAt: string;
    total: number;
    itemCount: number;
  }[];
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const u = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      staffRole: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      orders: {
        orderBy: { placedAt: "desc" },
        select: {
          orderNo: true,
          status: true,
          placedAt: true,
          total: true,
          _count: { select: { items: true } },
        },
      },
    },
  });
  if (!u) return null;

  const counted = u.orders.filter(
    (o) => o.status !== "CANCELLED" && o.status !== "RETURNED",
  );

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    joinedAt: u.createdAt.toISOString(),
    isStaff: u.staffRole !== null,
    orderCount: u.orders.length,
    totalSpent: counted.reduce((n, o) => n + o.total, 0),
    lastOrderAt: u.orders[0]?.placedAt.toISOString() ?? null,
    addresses: u.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      address: a.address,
      area: a.area === "INSIDE_DHAKA" ? "inside-dhaka" : "outside-dhaka",
      isDefault: a.isDefault,
    })),
    orders: u.orders.map((o) => ({
      orderNo: o.orderNo,
      status: o.status,
      placedAt: o.placedAt.toISOString(),
      total: o.total,
      itemCount: o._count.items,
    })),
  };
}

/* --- collections ---------------------------------------------------------- */

export interface AdminCollectionRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "CATEGORY" | "RULE";
  rule: "NEW" | "ON_OFFER" | "BESTSELLER" | null;
  position: number;
  isActive: boolean;
  /** Category slugs in a CATEGORY collection. Empty for a RULE one. */
  categoryIds: string[];
  /** What the shopper would currently see in it. */
  productCount: number;
}

export async function listCollections(): Promise<AdminCollectionRow[]> {
  const [collections, products] = await Promise.all([
    db.collection.findMany({
      orderBy: { position: "asc" },
      include: {
        categories: {
          orderBy: { position: "asc" },
          select: { categoryId: true, category: { select: { slug: true } } },
        },
      },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: {
        badge: true,
        price: true,
        compareAtPrice: true,
        category: { select: { slug: true } },
      },
    }),
  ]);

  return collections.map((c) => {
    const members = new Set(c.categories.map((cc) => cc.category.slug));
    /**
     * Counted the same way the storefront resolves them, so the number here is
     * what a shopper would actually find. A count that disagrees with the page
     * is worse than no count — it is the client's evidence that the panel is
     * lying to them.
     */
    const matches = products.filter((p) => {
      switch (c.rule) {
        case "NEW":
          return p.badge === "NEW";
        case "BESTSELLER":
          return p.badge === "BESTSELLER";
        case "ON_OFFER":
          return Boolean(p.compareAtPrice && p.compareAtPrice > p.price);
        default:
          return members.has(p.category.slug);
      }
    });

    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      kind: c.kind,
      rule: c.rule,
      position: c.position,
      isActive: c.isActive,
      categoryIds: c.categories.map((cc) => cc.categoryId),
      productCount: matches.length,
    };
  });
}
