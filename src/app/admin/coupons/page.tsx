import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card } from "@/components/admin/admin-ui";
import { CouponManager } from "@/components/admin/coupon-manager";
import { requireCatalogAccess } from "@/lib/admin/access";
import { listCoupons } from "@/lib/admin/coupon-admin";

export const metadata: Metadata = {
  title: "Discount codes",
  robots: { index: false, follow: false },
};

/**
 * Discount codes.
 *
 * Catalogue access rather than owner-only: a coupon is a price, and whoever is
 * trusted with prices is trusted with these. Every change is in the activity
 * log either way, because a code is money leaving the shop.
 */
export default async function AdminCouponsPage() {
  await requireCatalogAccess();
  const coupons = await listCoupons();

  return (
    <AdminPage
      title="Discount codes"
      lead="Codes customers type at checkout. What each one is worth is worked out here, not in their browser."
    >
      <CouponManager coupons={coupons} />

      <Card className="mt-5 max-w-2xl p-4">
        <h2 className="text-[14px] font-semibold">How they are applied</h2>
        <p className="mt-1.5 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
          A customer sees what a code would save before they commit, but the
          order is priced again when it is placed — from these rules and from
          today&apos;s prices. A code cannot be edited into an order, and a code
          with a total limit cannot be spent past it even by two people typing
          it at the same moment.
        </p>
        <p className="mt-2 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
          Cancelled orders give the use back, so a customer whose order you
          cancel can use the code again.
        </p>
      </Card>
    </AdminPage>
  );
}
