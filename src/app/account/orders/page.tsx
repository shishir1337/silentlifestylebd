import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { getViewerOrders } from "@/lib/order-reads";
import { AccountOrders } from "@/components/account/account-orders";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: true },
};

/** Gated in the page rather than the layout — see the note on the overview. */
export default async function AccountOrdersPage() {
  await requireUser();
  const orders = await getViewerOrders();
  return <AccountOrders orders={orders} />;
}
