"use client";

import { useEffect, useState } from "react";
import { listOrders } from "@/lib/order-storage";
import type { Order } from "@/lib/orders";

/**
 * Orders this browser knows about, newest first.
 *
 * Shared by the dashboard, the orders list and the tracker so the three cannot
 * disagree about what exists. Reads once on mount — localStorage has no change
 * events within a tab, and an order can only be created by this same app.
 */
export function useDeviceOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOrders(listOrders());
    setReady(true);
  }, []);

  return { orders, ready };
}
