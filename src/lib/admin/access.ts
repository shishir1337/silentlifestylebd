import "server-only";

import type { StaffRole } from "@prisma/client";
import { assertStaff, requireStaff, type StaffUser } from "@/lib/dal";

/**
 * Who is allowed to do what in the admin panel.
 *
 * Named sets rather than role checks scattered through the code, so the
 * question "can a Staff user edit a price?" has one answer in one place. Add a
 * role and every call site picks it up; write `role === "OWNER"` inline and one
 * of them will be missed.
 *
 * The three roles come from the schema and mean:
 *
 *   OWNER    everything, including staff and settings
 *   MANAGER  catalogue, orders and site content — but not staff or settings
 *   STAFF    orders only
 *
 * Staff deliberately cannot touch the catalogue. Someone confirming orders on
 * a phone all day should not be one mistap away from changing a price.
 */

export const CAN_MANAGE_CATALOG: StaffRole[] = ["OWNER", "MANAGER"];
export const CAN_MANAGE_ORDERS: StaffRole[] = ["OWNER", "MANAGER", "STAFF"];
export const CAN_MANAGE_CONTENT: StaffRole[] = ["OWNER", "MANAGER"];
export const CAN_MANAGE_STAFF: StaffRole[] = ["OWNER"];
export const CAN_MANAGE_SETTINGS: StaffRole[] = ["OWNER"];

/** For pages: redirects anyone not allowed. */
export function requireCatalogAccess(): Promise<StaffUser> {
  return requireStaff(CAN_MANAGE_CATALOG);
}

/**
 * For Server Actions: throws rather than redirecting.
 *
 * An action must not answer an authorisation failure with a redirect — that is
 * a normal-looking response, and a caller that ignores it carries on as though
 * the mutation succeeded.
 */
export function assertCatalogAccess(): Promise<StaffUser> {
  return assertStaff(CAN_MANAGE_CATALOG);
}

export function assertContentAccess(): Promise<StaffUser> {
  return assertStaff(CAN_MANAGE_CONTENT);
}

/** For pages: redirects anyone who cannot edit site content. */
export function requireContentAccess(): Promise<StaffUser> {
  return requireStaff(CAN_MANAGE_CONTENT);
}

export function can(role: StaffRole, allowed: StaffRole[]): boolean {
  return allowed.includes(role);
}
