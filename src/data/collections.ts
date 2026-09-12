import type { Product } from "@/types/catalog";

/**
 * Curated collections — the slugs that are not categories.
 *
 * The header, footer and promo tiles all link to these, so they live in one
 * place with an explicit predicate each. Category slugs are resolved from
 * `categories.ts` instead; the route handles both.
 */
export interface CuratedCollection {
  slug: string;
  name: string;
  description: string;
  /** Which products belong. Kept as a predicate so it stays in sync with data. */
  match: (p: Product) => boolean;
}

export const curatedCollections: CuratedCollection[] = [
  {
    slug: "men",
    name: "Men Collection",
    description:
      "Panjabi, formal shirts, t-shirts, polos, pants, shoes, belts and wallets.",
    match: (p) => MEN_CATEGORIES.has(p.categorySlug),
  },
  {
    slug: "women",
    name: "Women Collection",
    description:
      "Pakistani stitched and unstitched sets, purses and bracelets.",
    match: (p) => WOMEN_CATEGORIES.has(p.categorySlug),
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Watches, belts, wallets and bracelets to finish the outfit.",
    match: (p) => ACCESSORY_CATEGORIES.has(p.categorySlug),
  },
  {
    slug: "new",
    name: "New In",
    description: "Fresh stock, added every week.",
    match: (p) => p.badge === "new",
  },
  {
    slug: "offers",
    name: "Offers",
    description: "Genuine markdowns — no inflated was-prices.",
    match: (p) => Boolean(p.compareAtPrice && p.compareAtPrice > p.price),
  },
  {
    slug: "bestsellers",
    name: "Bestsellers",
    description: "What customers across Bangladesh are ordering most.",
    match: (p) => p.badge === "bestseller",
  },
];

/**
 * Category membership for the three audience groups. Declared here rather than
 * read off `Category.group` so a product can sit in a men's group even when its
 * category is shared (shoes and belts are sold to everyone).
 */
const MEN_CATEGORIES = new Set([
  "panjabi",
  "formal-shirt",
  "t-shirt",
  "polo",
  "pants",
  "shoes",
  "belts",
  "wallets",
  "watches",
]);

const WOMEN_CATEGORIES = new Set([
  "pakistani-stitched",
  "purses",
  "bracelets",
]);

const ACCESSORY_CATEGORIES = new Set([
  "watches",
  "belts",
  "wallets",
  "bracelets",
  "purses",
]);

export const curatedBySlug = new Map(curatedCollections.map((c) => [c.slug, c]));

/* --- Sorting ------------------------------------------------------------- */

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function isSortValue(v: string | undefined): v is SortValue {
  return SORT_OPTIONS.some((o) => o.value === v);
}

const discountOf = (p: Product) =>
  p.compareAtPrice && p.compareAtPrice > p.price
    ? (p.compareAtPrice - p.price) / p.compareAtPrice
    : 0;

export function sortProducts(list: Product[], sort: SortValue): Product[] {
  // Copy first — the caller's array is module-level data shared across requests.
  const out = [...list];
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "discount":
      return out.sort((a, b) => discountOf(b) - discountOf(a));
    default:
      // Featured: in stock first, then the merchandised order from the data file.
      return out.sort((a, b) => Number(b.inStock) - Number(a.inStock));
  }
}
