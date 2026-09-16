"use client";

import { useEffect, useRef } from "react";
import { trackViewContent } from "@/lib/tracking";

/**
 * Reports that this product was looked at.
 *
 * Its own component rather than an effect bolted onto the buy box: this is the
 * event most of the ad spend is optimised against — nearly every visitor
 * arrives on a product page straight from an advertisement — and it should be
 * findable by searching for what it does rather than buried in a component
 * about sizes and quantities.
 *
 * Renders nothing.
 */
export function TrackProductView({
  sku,
  name,
  category,
  price,
}: {
  sku: string;
  name: string;
  category: string;
  price: number;
}) {
  /*
    One report per product, not one per effect run.

    Strict Mode runs effects twice on mount in development, and the ref
    survives that because it is the same fiber — so what reaches the dataLayer
    in development is what will reach it in production. Debugging a funnel
    against numbers that are only doubled on a developer's machine is a day
    nobody gets back.
  */
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (reported.current === sku) return;
    reported.current = sku;
    trackViewContent({ sku, name, category, price, quantity: 1 });
  }, [sku, name, category, price]);

  return null;
}
