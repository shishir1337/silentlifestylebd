import type { OrderStatus } from "@prisma/client";
import type { StaffRole } from "@prisma/client";

/**
 * Which status an order may move to, and who may move it.
 *
 * A table rather than a dropdown of all seven. An order that has been delivered
 * cannot go back to "confirmation pending", and a panel that offers the choice
 * will eventually have somebody take it — then the shop's own history says a
 * parcel it has already been paid for is waiting on a phone call.
 *
 * Cancelled and returned are terminal on purpose. Undoing either would have to
 * un-restore stock that may since have been sold, and the honest recovery is a
 * new order, which is also what the customer experiences.
 */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

/**
 * Statuses that put the goods back on the shelf.
 *
 * Reaching either of these restores the stock the order took. Both are
 * terminal, which is what stops stock being restored twice — there is no path
 * out of them and therefore no path back in.
 */
export const RESTOCKING: OrderStatus[] = ["CANCELLED", "RETURNED"];

/**
 * Cancelling is not part of the daily flow.
 *
 * Staff exist to move parcels forward: confirm, pack, ship, deliver. Taking an
 * order out of the system loses a sale and needs a reason the shop stands
 * behind, so it stays with the people accountable for that.
 */
const OWNER_ONLY: OrderStatus[] = ["CANCELLED"];

export function canTransition(
  role: StaffRole,
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (!NEXT_STATUSES[from].includes(to)) return false;
  if (OWNER_ONLY.includes(to) && role === "STAFF") return false;
  return true;
}

/** What the button says. Verb first — it is an action, not a label. */
export const TRANSITION_LABEL: Record<OrderStatus, string> = {
  PENDING: "Move back to pending",
  CONFIRMED: "Confirm",
  PACKED: "Mark packed",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel order",
  RETURNED: "Mark returned",
};

/**
 * The one obvious next step, for the quick action in a list row.
 *
 * Always the forward move, never the destructive one: a button that appears in
 * every row and sometimes cancels an order is a mistap waiting to happen.
 */
export function primaryNext(status: OrderStatus): OrderStatus | null {
  const [next] = NEXT_STATUSES[status];
  return next && !OWNER_ONLY.includes(next) ? next : null;
}
