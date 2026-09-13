"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/dal";
import { CAN_MANAGE_ORDERS } from "@/lib/admin/access";
import { canTransition, RESTOCKING } from "@/lib/admin/order-flow";
import { CATALOG_TAG, PRODUCTS_TAG } from "@/lib/catalog";
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
    select: { id: true, status: true },
  });
  if (!order) return { ok: false, message: "That order no longer exists." };

  if (order.status === to) {
    // Not an error — two people tapped the same button, or a page was stale.
    return { ok: true, id: order.id };
  }

  if (!canTransition(staff.role, order.status, to)) {
    return {
      ok: false,
      message:
        staff.role === "STAFF" && to === "CANCELLED"
          ? "Only the owner or a manager can cancel an order."
          : `An order that is ${LABEL[order.status]} cannot be moved to ${LABEL[to]}.`,
    };
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
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: to },
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

      if (RESTOCKING.includes(to)) {
        /**
         * Put the goods back.
         *
         * Only from a status that had taken them — which is all of them, since
         * stock is decremented at placement. Both restocking statuses are
         * terminal, so an order cannot pass through twice and cannot be
         * restocked twice.
         */
        const items = await tx.orderItem.findMany({
          where: { orderId: order.id, variantId: { not: null } },
          select: { variantId: true, qty: true },
        });
        for (const item of items) {
          await tx.productVariant.update({
            where: { id: item.variantId! },
            data: { stock: { increment: item.qty } },
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
