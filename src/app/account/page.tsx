import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { getViewerOrders } from "@/lib/order-reads";
import { AccountOverview } from "@/components/account/account-overview";

export const metadata: Metadata = {
  title: "My account",
  description: "Your orders, addresses and details.",
  // Shows a customer's own order history; nothing here belongs in an index.
  robots: { index: false, follow: true },
};

/**
 * Account overview.
 *
 * The gate is here, in the page, not in `account/layout.tsx`. A layout does not
 * decide whether its child segments render — the router renders them regardless
 * and they reach the RSC payload — so a check up there would look like a lock
 * and stop nothing. Each of the four account pages calls the DAL itself.
 */
export default async function AccountPage() {
  await requireUser();
  const orders = await getViewerOrders();
  return <AccountOverview orders={orders} />;
}
