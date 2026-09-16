import type { StaffRole } from "@prisma/client";

/**
 * Who is allowed to do what, as plain data.
 *
 * Split out of `access.ts` because that module is `server-only` and the panel
 * has to answer the same question in the browser: a control the current role
 * may not use should not be drawn, and importing the server module to find out
 * pulls `server-only` into the client graph and fails the build.
 *
 * These are still the one definition — `access.ts` re-exports them, so the
 * guard that actually enforces a rule and the control that offers it read the
 * same array. Hiding a control is a courtesy, never a boundary; every action
 * checks again on the server, where the answer cannot be edited by the person
 * being checked.
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

/**
 * Deleting an order, which is not the same as cancelling one.
 *
 * Cancelling is a daily decision: the sale is lost, the goods go back, and the
 * record of what happened stays. Deleting destroys the record — the customer's
 * address, what they bought, who moved it through which statuses, and the
 * order the shop's own takings were counted from.
 *
 * There is one honest reason to want it (clearing out test orders before a
 * shop opens, or an order created twice by a double tap) and several bad ones,
 * and the difference is never visible from inside the panel. So it is the
 * owner's to make, and it leaves an entry in Activity naming what was
 * destroyed — which is the closest thing to undo that a delete can offer.
 */
export const CAN_DELETE_ORDERS: StaffRole[] = ["OWNER"];

export function can(role: StaffRole, allowed: StaffRole[]): boolean {
  return allowed.includes(role);
}
