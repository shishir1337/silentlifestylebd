import type { Metadata } from "next";
import { AccountAddresses } from "@/components/account/account-addresses";

export const metadata: Metadata = {
  title: "Addresses",
  robots: { index: false, follow: true },
};

export default function AccountAddressesPage() {
  return <AccountAddresses />;
}
