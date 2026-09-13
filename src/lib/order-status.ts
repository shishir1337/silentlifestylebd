import type { OrderStatusView } from "@/lib/order-reads";

/**
 * How each order status is shown to a customer.
 *
 * Written from the shopper's side of the door, not the shop's. "PACKED" is an
 * operations word; "Packed, ready to send" is what someone waiting for a parcel
 * wants to read. The staff-facing wording belongs in the admin panel, where a
 * one-word label is the useful one.
 *
 * The order below is the order of the progress track, so the two cannot fall
 * out of step.
 */

export const ORDER_FLOW: OrderStatusView[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

interface StatusCopy {
  label: string;
  /** One line, present tense, saying what is happening now. */
  detail: string;
  tone: "neutral" | "progress" | "held" | "done" | "stopped";
}

export const ORDER_STATUS: Record<OrderStatusView, StatusCopy> = {
  PENDING: {
    label: "Confirmation pending",
    detail: "We will call you to confirm your size and address before dispatch.",
    tone: "neutral",
  },
  CONFIRMED: {
    label: "Confirmed",
    detail: "Your order is confirmed and is being prepared.",
    tone: "progress",
  },
  ON_HOLD: {
    label: "On hold",
    detail:
      "We are holding your order while we check something with you. We will call.",
    tone: "held",
  },
  PACKED: {
    label: "Packed",
    detail: "Your parcel is packed and waiting for the courier.",
    tone: "progress",
  },
  SHIPPED: {
    label: "Out for delivery",
    detail: "The courier has your parcel. Keep your phone nearby.",
    tone: "progress",
  },
  DELIVERED: {
    label: "Delivered",
    detail: "Delivered and paid. Thank you.",
    tone: "done",
  },
  CANCELLED: {
    label: "Cancelled",
    detail: "This order was cancelled. Call us if that is not right.",
    tone: "stopped",
  },
  RETURNED: {
    label: "Returned",
    detail: "This order came back to us. Call us if you expected otherwise.",
    tone: "stopped",
  },
};

/** Tailwind classes for the status chip, keyed by tone. */
export const STATUS_CHIP: Record<StatusCopy["tone"], string> = {
  neutral: "bg-muted text-ink-soft",
  progress: "bg-brand-tint text-brand",
  held: "bg-[var(--color-hold-tint)] text-[var(--color-hold)]",
  done: "bg-brand text-on-brand",
  stopped: "bg-sale-tint text-sale",
};

/**
 * How far along the track an order is, or -1 when it left the track.
 *
 * Cancelled and returned orders have no position on a line that ends in
 * "Delivered", and pretending otherwise would show a parcel still moving. A
 * held order is off the track for the same reason: it is not moving, and a
 * progress bar that says otherwise is the shop telling the customer something
 * untrue.
 */
export function flowIndex(status: OrderStatusView): number {
  return ORDER_FLOW.indexOf(status);
}
