/**
 * Every `localStorage` key the storefront owns.
 *
 * Collected here because the keys outlive the code that writes them: a browser
 * that shopped last week still holds data under these names. Naming them once
 * means the migration to real accounts and real orders is a grep rather than a
 * hunt, and it removes the string literals that had already been repeated
 * across three files.
 *
 * The `.v1` suffix is the migration escape hatch — a shape change bumps the
 * version and abandons the old key rather than trying to read data written by
 * an older build.
 */
export const STORAGE_KEYS = {
  cart: "slbd.cart.v1",
  orders: "slbd.orders.v1",
  profile: "slbd.profile.v1",
  addresses: "slbd.addresses.v1",
} as const;
