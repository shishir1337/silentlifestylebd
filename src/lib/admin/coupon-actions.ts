"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertCatalogAccess } from "@/lib/admin/access";
import { recordAudit } from "@/lib/admin/audit";
import type { SaveResult } from "@/lib/admin/catalog-types";
import type { CouponInput } from "@/lib/admin/coupon-types";

/**
 * Making and unmaking discount codes.
 *
 * Catalogue access rather than owner-only: a coupon is a price, and whoever is
 * trusted with prices is trusted with this. It is audited either way, because
 * a code is money leaving the shop and the question "who made this" has an
 * answer worth keeping.
 *
 * Nothing here computes a discount. What a code is worth is decided in
 * `lib/coupons.ts` at the moment an order is placed, from these rows — this
 * file only decides what the rows say.
 */

function validate(input: CouponInput): string | null {
  const code = input.code.trim();
  if (code.length < 3) return "A code needs at least three characters.";
  if (!/^[A-Z0-9-]+$/i.test(code)) {
    return "Use letters, numbers and dashes only — customers type this on a phone.";
  }

  if (input.kind === "PERCENT") {
    if (input.value < 1 || input.value > 100) return "A percentage must be between 1 and 100.";
  } else if (input.kind === "FIXED") {
    if (input.value < 1) return "Enter how much comes off, in taka.";
    if (input.minSpend > 0 && input.value >= input.minSpend) {
      // Not fatal arithmetic, but it means the code can zero an order that
      // only just qualifies, which is almost never what was meant.
      return "The discount is as large as the minimum spend. Raise the minimum, or lower the discount.";
    }
  }

  if (input.minSpend < 0 || input.maxDiscount < 0) return "Amounts cannot be negative.";
  if (input.usageLimit < 0 || input.perPhoneLimit < 0) return "Limits cannot be negative.";

  if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
    return "The end date is before the start date.";
  }

  return null;
}

export async function saveCoupon(input: CouponInput): Promise<SaveResult> {
  const actor = await assertCatalogAccess();

  const problem = validate(input);
  if (problem) return { ok: false, message: problem };

  const code = input.code.trim().toUpperCase();
  const data = {
    code,
    kind: input.kind,
    // A free-delivery code has no amount; storing whatever was in the box
    // would leave a number nothing reads and everything has to explain.
    value: input.kind === "FREE_DELIVERY" ? 0 : Math.round(input.value),
    minSpend: Math.round(input.minSpend),
    maxDiscount: input.kind === "PERCENT" ? Math.round(input.maxDiscount) : 0,
    usageLimit: Math.round(input.usageLimit),
    perPhoneLimit: Math.round(input.perPhoneLimit),
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    isActive: input.isActive,
  };

  try {
    const row = input.id
      ? await db.coupon.update({ where: { id: input.id }, data })
      : await db.coupon.create({ data });

    await recordAudit(
      actor,
      input.id ? "coupon.changed" : "coupon.created",
      row.id,
      `${code} — ${describe(data)}`,
    );

    revalidatePath("/admin/coupons");
    return { ok: true, id: row.id };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { ok: false, message: `There is already a code called ${code}.` };
    }
    throw error;
  }
}

/**
 * Switching a code off, which is what "delete" should almost always mean.
 *
 * A code that has been used is never deleted: the orders that used it point at
 * it, and an order that cannot say why it was cheaper is an order nobody can
 * explain to the customer who placed it.
 */
export async function setCouponActive(id: string, isActive: boolean): Promise<SaveResult> {
  const actor = await assertCatalogAccess();
  const row = await db.coupon.update({ where: { id }, data: { isActive } });
  await recordAudit(
    actor,
    "coupon.changed",
    id,
    `${row.code} — ${isActive ? "switched on" : "switched off"}`,
  );
  revalidatePath("/admin/coupons");
  return { ok: true, id };
}

export async function deleteCoupon(id: string): Promise<SaveResult> {
  const actor = await assertCatalogAccess();

  const used = await db.order.count({ where: { couponId: id } });
  if (used > 0) {
    return {
      ok: false,
      message: `This code is on ${used} ${used === 1 ? "order" : "orders"}, so it cannot be deleted. Switch it off instead — it stops working straight away and the orders keep their history.`,
    };
  }

  const row = await db.coupon.delete({ where: { id } });
  await recordAudit(actor, "coupon.deleted", id, `${row.code} deleted — never used`);
  revalidatePath("/admin/coupons");
  return { ok: true };
}

function describe(data: {
  kind: string;
  value: number;
  minSpend: number;
  usageLimit: number;
}): string {
  const what =
    data.kind === "FREE_DELIVERY"
      ? "free delivery"
      : data.kind === "PERCENT"
        ? `${data.value}% off`
        : `৳${data.value} off`;
  const min = data.minSpend > 0 ? `, over ৳${data.minSpend}` : "";
  const limit = data.usageLimit > 0 ? `, ${data.usageLimit} uses` : "";
  return `${what}${min}${limit}`;
}
