"use client";

import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { Order } from "@/lib/orders";

/**
 * Orders kept in the browser.
 *
 * There is no orders backend yet, so a placed order is written to
 * `localStorage` and the confirmation page reads it back. This is a stand-in
 * with two real limits worth stating: the order exists only on the device that
 * placed it, and the shop owner never sees it. Phase 2 replaces both functions
 * with a Server Action and deletes this file.
 *
 * The `"use client"` directive is the point of the split. These functions touch
 * `window` and must never run on the server; with the directive, a server
 * import fails at build time instead of at the first request.
 */

function readAll(): Record<string, Order> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.orders);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, Order>) : {};
  } catch {
    return {};
  }
}

/** Every order this device has placed, newest first. */
export function listOrders(): Order[] {
  return Object.values(readAll()).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export function saveOrder(order: Order): void {
  try {
    const all = readAll();
    all[order.id] = order;
    window.localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(all));
  } catch {
    // Private mode or quota. The confirmation falls back to its empty state.
  }
}

export function getOrder(id: string): Order | undefined {
  return readAll()[id];
}
