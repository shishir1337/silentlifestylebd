import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { normalisePhone } from "@/lib/phone";
import type { DeliveryArea } from "@/lib/orders";
import type { DeliverySettings } from "@/types/settings";

/**
 * What a coupon is worth, decided in one place.
 *
 * The browser asks this to show a customer what a code would save; the order
 * asks it again at placement and uses that answer. Two callers, one function,
 * so the quote and the charge cannot disagree — which matters more here than
 * anywhere else in the shop, because the difference between them is money the
 * customer was promised and did not get, or money the shop did not take.
 *
 * Everything is whole taka. `Math.floor` on every division, so rounding is
 * always in the customer's favour by at most one taka and never against them.
 */

export type CouponFailure =
  | "unknown"
  | "inactive"
  | "not-started"
  | "expired"
  | "used-up"
  | "already-used"
  | "below-minimum";

export interface CouponPricing {
  /** Off the goods. Zero for free delivery, which zeroes the charge instead. */
  discount: number;
  /** What is actually charged for delivery after the coupon. */
  deliveryCharge: number;
  total: number;
}

export interface CouponQuote extends CouponPricing {
  ok: true;
  code: string;
  couponId: string;
  /** One line for the customer, e.g. "20% off — you save ৳458". */
  summary: string;
}

export interface CouponRefusal {
  ok: false;
  reason: CouponFailure;
  message: string;
}

/** The fields pricing needs. Narrow on purpose — nothing else may influence it. */
type CouponRow = {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED" | "FREE_DELIVERY";
  value: number;
  minSpend: number;
  maxDiscount: number;
  usageLimit: number;
  usageCount: number;
  perPhoneLimit: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

const taka = (n: number) => `৳${n.toLocaleString("en-US")}`;

/**
 * The delivery charge before any coupon touches it.
 *
 * The free-delivery threshold is judged on the goods subtotal *before* the
 * discount. A coupon that drops an order under the threshold and then charges
 * delivery for the privilege reads as a penalty for using it, and explaining
 * that to a customer on the phone costs more than the delivery.
 */
export function baseDelivery(
  area: DeliveryArea,
  subtotal: number,
  rates: DeliverySettings,
): number {
  if (subtotal >= rates.freeThreshold) return 0;
  return area === "inside-dhaka" ? rates.insideDhaka : rates.outsideDhaka;
}

/** What this coupon does to these numbers. Pure — no reads, no clock. */
export function priceWithCoupon(
  coupon: Pick<CouponRow, "kind" | "value" | "maxDiscount">,
  subtotal: number,
  delivery: number,
): CouponPricing {
  if (coupon.kind === "FREE_DELIVERY") {
    return { discount: 0, deliveryCharge: 0, total: subtotal };
  }

  let discount =
    coupon.kind === "PERCENT"
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;

  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  // Never more than the goods: a coupon is a discount, not a refund.
  discount = Math.max(0, Math.min(discount, subtotal));

  return { discount, deliveryCharge: delivery, total: subtotal - discount + delivery };
}

function summarise(coupon: CouponRow, pricing: CouponPricing, delivery: number): string {
  if (coupon.kind === "FREE_DELIVERY") {
    return delivery > 0
      ? `Free delivery — you save ${taka(delivery)}`
      : "Free delivery — already free on this order";
  }
  const what = coupon.kind === "PERCENT" ? `${coupon.value}% off` : `${taka(coupon.value)} off`;
  return `${what} — you save ${taka(pricing.discount)}`;
}

/**
 * Can this phone number use this code on this basket, right now?
 *
 * The phone is part of the question because `perPhoneLimit` is the only thing
 * stopping one person spending a launch code forty times. It is normalised
 * first, so `+8801711…` and `01711…` are one customer rather than two.
 */
export async function quoteCoupon(input: {
  code: string;
  subtotal: number;
  area: DeliveryArea;
  phone: string;
  rates: DeliverySettings;
  /** Inside a transaction, pass the transaction client. */
  client?: Prisma.TransactionClient | PrismaClient;
}): Promise<CouponQuote | CouponRefusal> {
  const prisma = input.client ?? db;
  const code = input.code.trim().toUpperCase();

  const refuse = (reason: CouponFailure, message: string): CouponRefusal => ({
    ok: false,
    reason,
    message,
  });

  if (!code) return refuse("unknown", "Enter a code.");

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  /*
    One message for "no such code" and for "inactive".

    Telling a stranger which codes exist but are switched off turns the field
    into a way to enumerate the shop's campaigns before they launch.
  */
  if (!coupon) return refuse("unknown", "That code is not valid.");
  if (!coupon.isActive) return refuse("inactive", "That code is not valid.");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return refuse("not-started", "That code is not valid yet.");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return refuse("expired", "That code has expired.");
  }
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return refuse("used-up", "That code has been fully used.");
  }
  if (input.subtotal < coupon.minSpend) {
    return refuse(
      "below-minimum",
      `This code needs an order of ${taka(coupon.minSpend)} or more.`,
    );
  }

  if (coupon.perPhoneLimit > 0) {
    const phone = normalisePhone(input.phone);
    if (phone) {
      const used = await prisma.order.count({
        where: {
          couponId: coupon.id,
          customerPhone: phone,
          // A cancelled order did not consume the offer.
          status: { notIn: ["CANCELLED"] },
        },
      });
      if (used >= coupon.perPhoneLimit) {
        return refuse(
          "already-used",
          coupon.perPhoneLimit === 1
            ? "This code has already been used on this number."
            : `This code can be used ${coupon.perPhoneLimit} times per number.`,
        );
      }
    }
  }

  const delivery = baseDelivery(input.area, input.subtotal, input.rates);
  const pricing = priceWithCoupon(coupon, input.subtotal, delivery);

  return {
    ok: true,
    code: coupon.code,
    couponId: coupon.id,
    summary: summarise(coupon, pricing, delivery),
    ...pricing,
  };
}
