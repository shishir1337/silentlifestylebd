import type { DeliveryArea } from "@/lib/orders";

/**
 * Shapes shared by the account's server actions and its client context.
 *
 * Their own module because the actions file carries `"use server"` — every
 * export there becomes a remote endpoint, and a type is not something you can
 * call over the wire. Importing types from it works, but it puts a network
 * boundary between a component and an `interface`, which reads as a mistake
 * even when it is not one.
 */

export interface Profile {
  name: string;
  phone: string;
  altPhone: string;
  /** Read-only for signed-in customers: it is their sign-in identifier. */
  email: string;
}

export interface Address {
  /** Empty string for one that has not been saved yet. */
  id: string;
  /** "Home", "Office" — what the customer calls it. */
  label: string;
  recipient: string;
  phone: string;
  address: string;
  area: DeliveryArea;
  isDefault: boolean;
}

/** What the client needs to render the account, in one reply. */
export interface AccountSnapshot {
  signedIn: boolean;
  /** Null for guests, who have no server-side profile by definition. */
  profile: Profile | null;
  addresses: Address[];
}

export const emptyProfile: Profile = { name: "", phone: "", altPhone: "", email: "" };
