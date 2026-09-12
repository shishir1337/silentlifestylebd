import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { AccountAddresses } from "@/components/account/account-addresses";

export const metadata: Metadata = {
  title: "Addresses",
  robots: { index: false, follow: true },
};

/** Gated in the page rather than the layout — see the note on the overview. */
export default async function AccountAddressesPage() {
  await requireUser();
  return <AccountAddresses />;
}
