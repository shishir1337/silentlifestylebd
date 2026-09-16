"use client";

import { useEffect, useRef } from "react";
import { trackPurchase, type TrackItem } from "@/lib/tracking";

/**
 * Reports the sale, once.
 *
 * The end of the funnel and the only event with money attached, so it is worth
 * saying where the guard against double counting is: not here. `trackPurchase`
 * remembers the order numbers it has already reported, because this page is a
 * real URL that gets refreshed, bookmarked, reopened from the order history
 * and forwarded to whoever is actually paying — and every one of those would
 * otherwise be another sale in the figures the shop bids on.
 *
 * The latch below is the cheaper half of the same guard: `items` is a new
 * array on every render, so without it this effect would re-run and go to
 * storage on each one, to conclude nothing every time.
 *
 * Renders nothing.
 */
export function TrackPurchase({
  orderNo,
  items,
  value,
}: {
  orderNo: string;
  items: TrackItem[];
  value: number;
}) {
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (reported.current === orderNo) return;
    reported.current = orderNo;
    trackPurchase(orderNo, items, value);
  }, [orderNo, items, value]);

  return null;
}
