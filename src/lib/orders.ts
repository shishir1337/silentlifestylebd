import { delivery } from "@/data/site";
import { BD_MOBILE, normalisePhone } from "@/lib/phone";

/**
 * What the checkout screen needs before it talks to the server.
 *
 * This module used to be the order system: it minted order numbers, held the
 * `Order` shape, and reached into `localStorage` with nothing marking it
 * browser-only. All three are gone. Orders are rows, their shape is
 * `OrderView`, and their numbers are minted server-side against the unique
 * column that actually enforces uniqueness.
 *
 * What is left is what the form itself needs: the delivery-charge arithmetic
 * for the quotation on screen, the same validators the server runs again, and
 * a date formatter. Every one of these is duplicated deliberately — the client
 * copy is a courtesy, the server copy is the decision.
 */

export type DeliveryArea = "inside-dhaka" | "outside-dhaka";

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
