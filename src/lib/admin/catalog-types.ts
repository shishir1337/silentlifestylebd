/**
 * Shapes the admin forms send to the catalogue actions.
 *
 * Their own module because `catalog-actions.ts` carries `"use server"`, where
 * every export becomes a callable endpoint — a network boundary is the wrong
 * place for an `interface`, even though it compiles away.
 */

export type ProductBadgeValue = "NEW" | "BESTSELLER" | "LIMITED";

export interface ProductInput {
  /** Absent when creating. */
  id?: string;
  name: string;
  /** Left blank, it is derived from the name. */
  slug?: string;
  sku: string;
  categoryId: string;
  price: number;
  compareAtPrice: number | null;
  /** Formatted. The plain `description` column is derived from it on save. */
  description: import("@/types/rich-text").RichText;
  badge: ProductBadgeValue | null;
  freeDelivery: boolean;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
  details: string[];
  colors: string[];
  /** One row per size. An empty size means "sold without sizes". */
  variants: { size: string; stock: number }[];
  primaryAssetId: string | null;
  hoverAssetId: string | null;
  /** Everything after those two, in display order. */
  galleryAssetIds: string[];
}

export interface CategoryInput {
  id?: string;
  name: string;
  slug?: string;
  tagline?: string;
  imageId: string | null;
  /** Which size chart this category's products are measured by; null for none. */
  sizeChartId: string | null;
  isActive: boolean;
}

/**
 * What every mutation returns.
 *
 * A failure carries a sentence meant for the person at the keyboard, not a
 * code — the client running this shop has nobody to translate it for them.
 */
export type SaveResult =
  | { ok: true; id?: string; slug?: string }
  | { ok: false; message: string };
