import type { Metadata } from "next";
import { AccountOrders } from "@/components/account/account-orders";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: true },
};

export default function AccountOrdersPage() {
  return <AccountOrders />;
}
