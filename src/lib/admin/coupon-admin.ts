import "server-only";

import { db } from "@/lib/db";

/**
 * Coupons, for the person who makes them.
 *
 * The list carries how much each code has actually been redeemed and what it
 * has cost, because the question a shop asks about a discount is never "does
 * it exist" — it is "was it worth it". A code with four hundred uses and no
 * revenue behind it is a code somebody posted somewhere it should not have
 * been.
 */

export interface AdminCoupon {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED" | "FREE_DELIVERY";
  value: number;
  minSpend: number;
  maxDiscount: number;
  usageLimit: number;
  usageCount: number;
  perPhoneLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  /** Orders placed with it that were not cancelled. */
  ordersPlaced: number;
  /** What those orders were worth, and what the code took off them. */
  revenue: number;
  given: number;
}

export async function listCoupons(): Promise<AdminCoupon[]> {
  const [coupons, totals] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.order.groupBy({
      by: ["couponId"],
      where: { couponId: { not: null }, status: { notIn: ["CANCELLED"] } },
      _count: { _all: true },
      _sum: { total: true, discount: true, deliveryCharge: true },
    }),
  ]);

  const byCoupon = new Map(totals.map((t) => [t.couponId, t]));

  return coupons.map((c) => {
    const t = byCoupon.get(c.id);
    /*
      A free-delivery coupon gives away the charge rather than a discount, and
      the row records the charge as zero. What it cost is therefore not in
      `discount` — it is the delivery that was not collected, which we cannot
      recover per order after the fact. Counting it as zero would flatter the
      code; this at least does not pretend otherwise, and the order count is
      the honest number for that kind.
    */
    return {
      id: c.id,
      code: c.code,
      kind: c.kind,
      value: c.value,
      minSpend: c.minSpend,
      maxDiscount: c.maxDiscount,
      usageLimit: c.usageLimit,
      usageCount: c.usageCount,
      perPhoneLimit: c.perPhoneLimit,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      isActive: c.isActive,
      ordersPlaced: t?._count._all ?? 0,
      revenue: t?._sum.total ?? 0,
      given: t?._sum.discount ?? 0,
    };
  });
}
