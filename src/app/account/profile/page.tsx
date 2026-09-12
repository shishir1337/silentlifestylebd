import type { Metadata } from "next";
import { AccountProfile } from "@/components/account/account-profile";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: true },
};

export default function AccountProfilePage() {
  return <AccountProfile />;
}
