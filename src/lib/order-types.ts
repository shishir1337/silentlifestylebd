import type { DeliveryArea } from "@/lib/orders";

/**
 * Shapes crossing the checkout boundary.
 *
 * Separate from `order-actions.ts` because that file carries `"use server"` —
 * every export there becomes a callable endpoint, and putting an `interface`
 * behind a network boundary reads as a mistake even when it compiles away.
 */

export interface PlaceOrderLine {
  productId: string;
  /** Empty string for products sold without a size. */
  size: string;
  qty: number;
}

export interface PlaceOrderInput {
  lines: PlaceOrderLine[];
  name: string;
  phone: string;
  altPhone?: string;
  address: string;
  note?: string;
  area: DeliveryArea;
  /** Optional discount code. Priced on the server; never trusted as an amount. */
  couponCode?: string;
}

export type PlaceOrderResult =
  | { ok: true; orderNo: string }
  | {
      ok: false;
      message: string;
      /**
       * Lines the shop cannot fulfil, so the cart can mark them rather than
       * making the customer work out which of six items was the problem.
       */
      unavailable?: { productId: string; size: string; available: number }[];
      /**
       * The coupon was the problem, not the order.
       *
       * Lets the form clear the code and invite another go, rather than
       * showing a general failure beside a filled-in address.
       */
      couponRejected?: boolean;
    };
