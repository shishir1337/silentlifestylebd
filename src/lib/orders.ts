import type { CartLine } from "@/lib/cart";
import { delivery } from "@/data/site";
import { BD_MOBILE, normalisePhone } from "@/lib/phone";

/**
 * Order shapes, pricing and validation.
 *
 * Everything here runs in either environment. That was not true before: this
 * module also held the `localStorage` persistence, with no `"use client"` to
 * say so, and worked only because every importer happened to be a client
 * component. The first Server Action to import it would have crashed on
 * `window`. The persistence now lives in `order-storage.ts`, which says what
 * it is, and Phase 2 deletes it outright.
 *
 * Pricing stays here because the checkout Server Action has to recompute it:
 * amounts that arrive from a browser are a statement of intent, not a fact.
 */

export type DeliveryArea = "inside-dhaka" | "outside-dhaka";

export interface OrderCustomer {
  name: string;
  phone: string;
  altPhone?: string;
  address: string;
  note?: string;
}

export interface Order {
  id: string;
  /** ISO timestamp. Rendered with a fixed format so it cannot drift by locale. */
  placedAt: string;
  customer: OrderCustomer;
  area: DeliveryArea;
  lines: CartLine[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  /** Only cash on delivery today; kept explicit so adding bKash is additive. */
  paymentMethod: "cod";
}

/**
 * Delivery charge.
 *
 * The free-delivery threshold applies to the goods subtotal, never to the
 * total — otherwise the charge itself could push an order over the line and
 * pay for its own removal.
 */
export function deliveryChargeFor(area: DeliveryArea, subtotal: number): number {
  if (subtotal >= delivery.freeThreshold) return 0;
  return area === "inside-dhaka" ? delivery.insideDhaka : delivery.outsideDhaka;
}

/**
 * Human-readable, reasonably unique order number: SLB-YYMMDD-XXXX.
 *
 * Customers read this out over the phone when they call about a parcel, so it
 * favours being short and unambiguous over being cryptographically random.
 *
 * "Reasonably unique" is doing real work in that sentence: 30^4 tails per day
 * is roughly 810,000 combinations, which is fine for a demo and not fine for a
 * record. Phase 2 mints this server-side and checks it against the unique
 * index on `Order.orderNo` before committing.
 */
export function makeOrderId(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  // Avoid 0/O and 1/I — they get misheard and mistyped.
  const alphabet = "23456789ACDEFGHJKLMNPQRTUVWXYZ";
  let tail = "";
  for (let i = 0; i < 4; i += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SLB-${yy}${mm}${dd}-${tail}`;
}

/** `2026-09-12T10:04:00Z` -> `12 Sep 2026`. Fixed format, no locale surprises. */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* --- Validation ----------------------------------------------------------- */

export interface CheckoutErrors {
  name?: string;
  phone?: string;
  address?: string;
}

export function validateCheckout(values: {
  name: string;
  phone: string;
  address: string;
}): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (values.name.trim().length < 3) {
    errors.name = "Enter your full name so the delivery man can ask for you.";
  }
  if (!BD_MOBILE.test(normalisePhone(values.phone))) {
    errors.phone = "Enter an 11-digit mobile number starting with 01, e.g. 01712345678.";
  }
  if (values.address.trim().length < 10) {
    errors.address = "Add house or flat, road and area so we can find you.";
  }

  return errors;
}
