/**
 * BDT formatting.
 *
 * We format manually rather than via `Intl.NumberFormat(..., {currency:'BDT'})`
 * because ICU output for BDT varies by runtime — "BDT 1,250.00" on some Node
 * builds, "৳1,250.00" on others. A server/client disagreement here is a
 * hydration error on a price, which is the worst possible place to have one.
 * Fixed grouping keeps server and browser byte-identical.
 */

const TAKA = "৳"; // ৳ BENGALI RUPEE SIGN

const grouper = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

/** `1250` -> `৳1,250` */
export function formatBDT(amount: number): string {
  return `${TAKA}${grouper.format(Math.round(amount))}`;
}

/**
 * Same value, but with the taka sign in its own element so it can be given a
 * Bengali-capable font stack (see `.taka` in globals.css). Use this wherever
 * the price is displayed; use `formatBDT` for aria-labels, meta and JSON-LD.
 */
export function bdtParts(amount: number): { symbol: string; value: string } {
  return { symbol: TAKA, value: grouper.format(Math.round(amount)) };
}

/** `1250` -> `1,250` — for when the symbol is rendered separately. */
export function formatAmount(amount: number): string {
  return grouper.format(Math.round(amount));
}

/** Whole-percent discount, floored so we never overstate the saving. */
export function discountPercent(price: number, compareAt: number): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.floor(((compareAt - price) / compareAt) * 100);
}

export { TAKA };
