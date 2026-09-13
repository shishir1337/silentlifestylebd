import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { AccountProfile } from "@/components/account/account-profile";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: true },
};

/** Gated in the page rather than the layout — see the note on the overview. */
export default async function AccountProfilePage() {
  await requireUser();
  return <AccountProfile />;
}
