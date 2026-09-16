import "server-only";

import { assertStaff, requireStaff, type StaffUser } from "@/lib/dal";

/**
 * The guards themselves. Who may do what lives in `roles.ts`.
 *
 * Split because the panel needs the same answer on both sides of the wire —
 * this module is `server-only` and a client component importing it would pull
 * that into the browser graph. Re-exported here so nothing that already asks
 * `access.ts` has to know, and so there is still exactly one definition of
 * each rule.
 */
export {
  CAN_MANAGE_CATALOG,
  CAN_MANAGE_ORDERS,
  CAN_MANAGE_CONTENT,
  CAN_MANAGE_STAFF,
  CAN_MANAGE_SETTINGS,
  CAN_DELETE_ORDERS,
  can,
} from "@/lib/admin/roles";

// Imported as well as re-exported: the guards below are what actually hold the
// line, and they read the same arrays every caller does.
import {
  CAN_MANAGE_CATALOG,
  CAN_MANAGE_CONTENT,
  CAN_MANAGE_STAFF,
  CAN_MANAGE_SETTINGS,
} from "@/lib/admin/roles";

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

/** Settings and staff are owner-only, so these two are the narrowest guards. */
export function requireSettingsAccess(): Promise<StaffUser> {
  return requireStaff(CAN_MANAGE_SETTINGS);
}

export function assertSettingsAccess(): Promise<StaffUser> {
  return assertStaff(CAN_MANAGE_SETTINGS);
}

export function requireStaffAccess(): Promise<StaffUser> {
  return requireStaff(CAN_MANAGE_STAFF);
}

export function assertStaffAccess(): Promise<StaffUser> {
  return assertStaff(CAN_MANAGE_STAFF);
}
