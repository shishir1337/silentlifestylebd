import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/account-overview";

export const metadata: Metadata = {
  title: "My account",
  description: "Your orders, addresses and details.",
  // Shows a customer's own order history; nothing here belongs in an index.
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return <AccountOverview />;
}
