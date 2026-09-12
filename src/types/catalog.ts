import type { StaticImageData } from "next/image";

export type Slug = string;

export interface Category {
  /** URL segment, e.g. "panjabi" -> /collections/panjabi */
  slug: Slug;
  name: string;
  /** Short line used on category tiles and nav. */
  tagline?: string;
  image: StaticImageData;
  /** Grouping used by the header's shop menu. */
  group: "men" | "women" | "accessories";
}

export interface Product {
  id: string;
  slug: Slug;
  name: string;
  categorySlug: Slug;
  /** Selling price in BDT (whole taka — no paisa in retail here). */
  price: number;
  /** Was-price in BDT. Present only when genuinely discounted. */
  compareAtPrice?: number;
  image: StaticImageData;
  /** Second image revealed on hover/focus. Optional. */
  hoverImage?: StaticImageData;
  /** Drives the single corner badge. Only one badge ever shows. */
  badge?: "new" | "bestseller" | "limited";
  /** Free delivery threshold is global, but some items always ship free. */
  freeDelivery?: boolean;
  inStock: boolean;
  colors?: string[];
  sizes?: string[];

  /* --- Product detail page ------------------------------------------------ */

  /** Stock keeping unit, shown on the detail page and used in structured data. */
  sku: string;
  /** One or two sentences. What it is and what it is like to wear. */
  description: string;
  /** Scannable specifics — fabric, fit, care. Shoppers read these, not prose. */
  details: string[];
}

export interface PromoTile {
  title: string;
  subtitle: string;
  href: string;
  image: StaticImageData;
  cta: string;
}
