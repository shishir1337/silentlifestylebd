import type { OrderStatus, StaffRole } from "@prisma/client";

/**
 * Where an order can go, and who can send it there.
 *
 * It used to be a one-way table: pending to confirmed to packed, and no way
 * back. The reasoning was that history should not be rewritten. In a real shop
 * it is the operator who is right and the panel that is wrong — a parcel gets
 * marked delivered by a mistap, a cancelled order is reinstated because the
 * customer rang back, an order is packed before anyone remembered to confirm
 * it. Refusing those left the shop's own records saying something untrue, with
 * no way to correct them.
 *
 * So every status can move to every other. What the table used to protect is
 * protected properly instead, in `Order.stockRestored`: the goods are put back
 * when an order first reaches cancelled or returned, taken again if it leaves,
 * and never twice either way. That is a fact about inventory, and inventory is
 * what was actually at risk — not the shape of the timeline.
 *
 * The one restriction left is about people rather than transitions: cancelling
 * loses a sale and needs someone accountable for it.
 */

/** The path a parcel takes when nothing goes wrong. */
export const ORDER_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

/**
 * Parked, and not on the path.
 *
 * Held is its own thing: the order is alive, the goods are still the
 * customer's, and nothing is happening until somebody gets hold of them. It is
 * kept out of `ORDER_FLOW` so the progress track does not claim a held parcel
 * is moving, and out of `RESTOCKING` so the goods are not sold to someone else
 * while the shop is still trying to reach the first buyer.
 */
export const HELD: OrderStatus = "ON_HOLD";

/** Statuses in which the goods are back on the shelf. */
export const RESTOCKING: OrderStatus[] = ["CANCELLED", "RETURNED"];

/** Cancelling is not part of the daily flow; it is a decision. */
const OWNER_AND_MANAGER: OrderStatus[] = ["CANCELLED"];

export const ALL_STATUSES: OrderStatus[] = [...ORDER_FLOW, HELD, ...RESTOCKING];

export function canTransition(
  role: StaffRole,
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return false;
  if (OWNER_AND_MANAGER.includes(to) && role === "STAFF") return false;
  return true;
}

/** Every move this role may make from here, in the order the menu shows them. */
export function transitionsFrom(role: StaffRole, from: OrderStatus): OrderStatus[] {
  return ALL_STATUSES.filter((to) => canTransition(role, from, to));
}

/** What the button says. Verb first — it is an action, not a label. */
export const TRANSITION_LABEL: Record<OrderStatus, string> = {
  PENDING: "Back to pending",
  CONFIRMED: "Confirm",
  ON_HOLD: "Put on hold",
  PACKED: "Mark packed",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel order",
  RETURNED: "Mark returned",
};

/**
 * The one obvious next step, for the button that sits in every row.
 *
 * The next step along the normal path, and never a destructive one: a button
 * that appears in every row and sometimes cancels an order is a mistap waiting
 * to happen. Everything else is one tap further, in the menu beside it.
 */
export function primaryNext(status: OrderStatus): OrderStatus | null {
  // A held order's obvious next move is back onto the path, which is what the
  // hold was waiting for: the customer confirming.
  if (status === HELD) return "CONFIRMED";
  const i = ORDER_FLOW.indexOf(status);
  if (i === -1 || i === ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[i + 1];
}

/**
 * What this move does to stock, given what has already been done.
 *
 * Driven by the flag rather than by the two statuses, which is what makes any
 * move safe: cancelling twice restores nothing the second time, and reinstating
 * a cancelled order takes the goods back exactly once.
 */
export function stockEffect(
  alreadyRestored: boolean,
  to: OrderStatus,
): "restore" | "take" | "none" {
  const shouldBeRestored = RESTOCKING.includes(to);
  if (shouldBeRestored && !alreadyRestored) return "restore";
  if (!shouldBeRestored && alreadyRestored) return "take";
  return "none";
}
