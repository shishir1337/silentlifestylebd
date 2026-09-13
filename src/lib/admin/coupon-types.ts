/**
 * What the coupon form sends.
 *
 * Its own file because the form is a Client Component and the actions are
 * `"use server"` — a `"use server"` file may only export async functions, so
 * a shared shape cannot live beside them. This project has shipped that bug
 * once already; the note is here so it is not shipped again.
 */
export interface CouponInput {
  id?: string;
  code: string;
  kind: "PERCENT" | "FIXED" | "FREE_DELIVERY";
  /** Percentage, or taka off. Ignored for free delivery. */
  value: number;
  minSpend: number;
  /** Caps a percentage. Ignored otherwise. */
  maxDiscount: number;
  /** 0 = unlimited. */
  usageLimit: number;
  /** 0 = unlimited. */
  perPhoneLimit: number;
  /** `YYYY-MM-DD`, or empty for no bound. */
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export const BLANK_COUPON: CouponInput = {
  code: "",
  kind: "PERCENT",
  value: 10,
  minSpend: 0,
  maxDiscount: 0,
  usageLimit: 0,
  perPhoneLimit: 1,
  startsAt: "",
  endsAt: "",
  isActive: true,
};
