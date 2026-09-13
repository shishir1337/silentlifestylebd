"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/dal";
import { CAN_MANAGE_ORDERS } from "@/lib/admin/access";
import { canTransition, stockEffect } from "@/lib/admin/order-flow";
import { CATALOG_TAG, PRODUCTS_TAG } from "@/lib/catalog";
import { getOrder, type AdminOrderDetail } from "@/lib/admin/order-reads";
import type { SaveResult } from "@/lib/admin/catalog-types";

/**
 * Moving an order through its statuses.
 *
 * Every change is one transaction that does three things together: the status,
 * the audit event, and — where the goods come back — the stock. Any of those
 * on its own is a lie. A cancelled order whose stock was not restored quietly
 * loses the shop a sale it could have made; stock restored without the status
 * change sells something twice.
 */

async function refresh(orderNo: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNo}`);
  revalidatePath("/admin");
  // The customer's own pages read the status straight from the database, so
  // they need nothing — but a restock changes what the shop can sell.
  revalidateTag(CATALOG_TAG, "max");
  revalidateTag(PRODUCTS_TAG, "max");
}

export async function changeOrderStatus(
  orderNo: string,
  to: OrderStatus,
  note?: string,
): Promise<SaveResult> {
  const staff = await assertStaff(CAN_MANAGE_ORDERS);

  const order = await db.order.findUnique({
    where: { orderNo },
    select: { id: true, status: true, stockRestored: true },
  });
  if (!order) return { ok: false, message: "That order no longer exists." };

  if (order.status === to) {
    // Not an error — two people tapped the same button, or a page was stale.
    return { ok: true, id: order.id };
  }

  if (!canTransition(staff.role, order.status, to)) {
    return { ok: false, message: "Only the owner or a manager can cancel an order." };
  }

  if (to === "CANCELLED" && !note?.trim()) {
    // The reason is what staff repeat to the customer on the phone, so it is
    // required rather than optional — an unexplained cancellation is a
    // conversation nobody can have.
    return { ok: false, message: "Give a reason for cancelling." };
  }

  try {
    await db.$transaction(async (tx) => {
      /**
       * Guarded by the status we read a moment ago.
       *
       * Two people working the same queue is normal in a shop. If the order
       * moved between the read and the write, this matches nothing and the
       * whole transaction is abandoned rather than applying a transition from
       * a state that is no longer true.
       */
      const effect = stockEffect(order.stockRestored, to);

      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status: to,
          ...(effect === "none" ? {} : { stockRestored: effect === "restore" }),
        },
      });
      if (count !== 1) throw new Stale();

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: to,
          note: note?.trim() || null,
          actorId: staff.id,
        },
      });

      /*
        Stock follows the flag, not the status.

        An order can now be moved anywhere from anywhere, so "cancelled means
        put it back" is no longer enough: cancelling an already-cancelled order
        would restore twice, and reinstating one would leave the shop counting
        goods it has already promised to somebody. `stockEffect` compares what
        has actually been done with what this status implies, and does only the
        difference.

        Taking stock back can drive a size below zero, if it was sold while the
        order sat cancelled. That is allowed and recorded rather than refused —
        the shop really is short, and hiding it behind a rejected status change
        would leave the order wrong as well as the inventory.
      */
      if (effect !== "none") {
        const items = await tx.orderItem.findMany({
          where: { orderId: order.id, variantId: { not: null } },
          select: { variantId: true, qty: true },
        });

        const short: string[] = [];
        for (const item of items) {
          const variant = await tx.productVariant.update({
            where: { id: item.variantId! },
            data: {
              stock:
                effect === "restore"
                  ? { increment: item.qty }
                  : { decrement: item.qty },
            },
            select: { stock: true, size: true, product: { select: { name: true } } },
          });
          if (variant.stock < 0) {
            short.push(`${variant.product.name}${variant.size ? ` (${variant.size})` : ""}`);
          }
        }

        if (short.length > 0) {
          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              note: `Stock is now short on ${short.join(", ")} — these were sold while the order was ${LABEL[order.status]}.`,
              actorId: staff.id,
            },
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof Stale) {
      return {
        ok: false,
        message: "Somebody else changed this order just now. Reload and try again.",
      };
    }
    console.error("[admin] changeOrderStatus failed:", error);
    return { ok: false, message: "Could not update the order. Please try again." };
  }

  await refresh(orderNo);
  return { ok: true, id: order.id };
}

/**
 * The same transition applied to a selection.
 *
 * One action rather than a loop of actions on the client: Server Actions are
 * dispatched one at a time, so ten calls from a browser is ten round trips in
 * sequence. Each order is still its own transaction — one failure must not
 * roll back nine successes.
 */
export async function bulkChangeOrderStatus(
  orderNos: string[],
  to: OrderStatus,
): Promise<{ ok: true; changed: number; skipped: number } | { ok: false; message: string }> {
  await assertStaff(CAN_MANAGE_ORDERS);

  if (orderNos.length === 0) return { ok: false, message: "Nothing selected." };
  if (orderNos.length > 100) {
    return { ok: false, message: "Select fewer than 100 orders at a time." };
  }
  if (to === "CANCELLED") {
    // Cancelling needs a reason each, and a reason that fits fifty orders is
    // not a reason. Deliberately not offered in bulk.
    return { ok: false, message: "Cancel orders one at a time, with a reason." };
  }

  let changed = 0;
  for (const orderNo of orderNos) {
    const result = await changeOrderStatus(orderNo, to);
    if (result.ok) changed += 1;
  }

  return { ok: true, changed, skipped: orderNos.length - changed };
}

/** A staff-only note on an order. Never shown to the customer. */
export async function addOrderNote(orderNo: string, note: string): Promise<SaveResult> {
  const staff = await assertStaff(CAN_MANAGE_ORDERS);
  const text = note.trim();
  if (!text) return { ok: false, message: "Write something first." };

  const order = await db.order.findUnique({ where: { orderNo }, select: { id: true } });
  if (!order) return { ok: false, message: "That order no longer exists." };

  await db.orderEvent.create({
    data: { orderId: order.id, note: text, actorId: staff.id },
  });

  await refresh(orderNo);
  return { ok: true, id: order.id };
}

/**
 * One order, for the quick view.
 *
 * An action rather than a prop on every row: the list carries 25 orders and
 * the quick view opens one. Sending every line item, address and event of all
 * 25 down with the page to serve the one that gets clicked would make the list
 * slower for everyone to make one panel instant for somebody.
 *
 * It re-checks access rather than trusting that the list rendered. An action
 * is a POST to a URL, and the only thing standing between it and the open
 * internet is this line.
 */
export async function fetchOrder(orderNo: string): Promise<AdminOrderDetail | null> {
  await assertStaff(CAN_MANAGE_ORDERS);
  return getOrder(orderNo);
}

class Stale extends Error {}

const LABEL: Record<OrderStatus, string> = {
  PENDING: "pending confirmation",
  CONFIRMED: "confirmed",
  PACKED: "packed",
  SHIPPED: "out for delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
};
