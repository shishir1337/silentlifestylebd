import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/dal";
import { canOpenOrder, deviceOrderNumbers } from "@/lib/order-access";
import { canonicalPhone } from "@/lib/phone";
import type { DeliveryArea } from "@/lib/orders";

/**
 * Reading orders back.
 *
 * Not cached, deliberately. An order's status is the one thing on this site a
 * customer refreshes to check, and a stale "Confirmation pending" after the
 * shop has already dispatched the parcel is worse than a database query.
 */

export interface OrderItemView {
  name: string;
  slug: string;
  /** Null on orders placed before the column existed. See the schema. */
  sku: string | null;
  size: string | null;
  color: string | null;
  unitPrice: number;
  qty: number;
  imageUrl: string;
}

export interface OrderView {
  orderNo: string;
  status: OrderStatusView;
  placedAt: string;
  customerName: string;
  customerPhone: string;
  altPhone: string | null;
  address: string;
  note: string | null;
  area: DeliveryArea;
  subtotal: number;
  /** Taken off the goods by a coupon. Zero when none applied. */
  discount: number;
  couponCode: string | null;
  deliveryCharge: number;
  total: number;
  items: OrderItemView[];
}

export type OrderStatusView =
  | "PENDING"
  | "CONFIRMED"
  | "ON_HOLD"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

const SELECT = {
  orderNo: true,
  status: true,
  placedAt: true,
  customerId: true,
  customerName: true,
  customerPhone: true,
  altPhone: true,
  address: true,
  note: true,
  area: true,
  subtotal: true,
  discount: true,
  couponCode: true,
  deliveryCharge: true,
  total: true,
  items: {
    orderBy: { id: "asc" },
    select: {
      name: true,
      slug: true,
      sku: true,
      size: true,
      color: true,
      unitPrice: true,
      qty: true,
      imageUrl: true,
    },
  },
} as const;

type Row = {
  orderNo: string;
  status: OrderStatusView;
  placedAt: Date;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  altPhone: string | null;
  address: string;
  note: string | null;
  area: "INSIDE_DHAKA" | "OUTSIDE_DHAKA";
  subtotal: number;
  /** Taken off the goods by a coupon. Zero when none applied. */
  discount: number;
  couponCode: string | null;
  deliveryCharge: number;
  total: number;
  items: OrderItemView[];
};

function toView(row: Row): OrderView {
  return {
    orderNo: row.orderNo,
    status: row.status,
    // Serialised here rather than passed as a Date: this crosses into Client
    // Components, and the formatter downstream takes an ISO string.
    placedAt: row.placedAt.toISOString(),
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    altPhone: row.altPhone,
    address: row.address,
    note: row.note,
    area: row.area === "INSIDE_DHAKA" ? "inside-dhaka" : "outside-dhaka",
    subtotal: row.subtotal,
    discount: row.discount,
    couponCode: row.couponCode,
    deliveryCharge: row.deliveryCharge,
    total: row.total,
    items: row.items,
  };
}

/**
 * One order, if the person asking is entitled to it.
 *
 * Two ways to qualify, and no third:
 *
 *  - the order belongs to the signed-in customer, or
 *  - this browser placed it, proven by the signed cookie.
 *
 * An order number on its own is never enough. It is four characters long and
 * meant to be read out over the phone; treating it as a secret would make the
 * confirmation page a slow but usable way to harvest names, phone numbers and
 * home addresses.
 */
export const getOrderForViewer = cache(async function getOrderForViewer(
  orderNo: string,
): Promise<OrderView | null> {
  const [session, allowedByDevice] = await Promise.all([
    getSession(),
    canOpenOrder(orderNo),
  ]);

  const row = await db.order.findUnique({
    where: { orderNo },
    select: SELECT,
  });
  if (!row) return null;

  const owned = Boolean(session && row.customerId === session.id);
  if (!owned && !allowedByDevice) return null;

  return toView(row as Row);
});

/**
 * Public lookup for the tracking page: order number **and** the phone it was
 * placed with. The phone is the shared secret a guest actually has.
 *
 * Both are needed. Either alone is guessable — order numbers by brute force,
 * phone numbers because they are eleven digits with a known prefix.
 */
export async function lookupOrder(
  orderNo: string,
  phone: string,
): Promise<OrderView | null> {
  const trimmed = orderNo.trim().toUpperCase();
  const normalised = canonicalPhone(phone);
  if (!trimmed || !normalised) return null;

  const row = await db.order.findFirst({
    where: { orderNo: trimmed, customerPhone: normalised },
    select: SELECT,
  });
  return row ? toView(row as Row) : null;
}

/**
 * The orders to offer someone without making them type a number.
 *
 * Signed in: everything on their account. Guest: whatever this browser placed,
 * which is the same promise the old `localStorage` version made, now with the
 * server checking rather than trusting.
 */
export async function getViewerOrders(limit = 20): Promise<OrderView[]> {
  const session = await getSession();

  if (session) {
    const rows = await db.order.findMany({
      where: { customerId: session.id },
      orderBy: { placedAt: "desc" },
      take: limit,
      select: SELECT,
    });
    return rows.map((r) => toView(r as Row));
  }

  const orderNos = await deviceOrderNumbers();
  if (orderNos.length === 0) return [];

  const rows = await db.order.findMany({
    where: { orderNo: { in: orderNos.slice(0, limit) } },
    orderBy: { placedAt: "desc" },
    select: SELECT,
  });
  return rows.map((r) => toView(r as Row));
}
