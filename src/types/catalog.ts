export type Slug = string;

/**
 * An image, as the storefront needs it.
 *
 * This replaces `StaticImageData` now that images live on ImageKit rather than
 * in the bundle. The extra fields are not optional decoration — `next/image`
 * uses `width`/`height` to reserve layout space and `blurDataURL` to render the
 * blur-up placeholder, both of which static imports used to supply for free.
 * Dropping them reintroduces the layout shift this site was built to avoid.
 */
export interface ImageRef {
  url: string;
  width: number;
  height: number;
  blurDataURL: string | null;
  alt: string | null;
}

export interface Category {
  /** URL segment, e.g. "panjabi" -> /collections/panjabi */
  slug: Slug;
  name: string;
  /** Short line used on category tiles and nav. */
  tagline: string | null;
  image: ImageRef | null;
}

export type ProductBadge = "new" | "bestseller" | "limited";

/**
 * A size and how many are left.
 *
 * Stock is per size now. `size` is an empty string for products sold without
 * one, so every stock check goes through the same path rather than branching on
 * whether a product has sizes.
 */
export interface ProductVariant {
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  slug: Slug;
  name: string;
  categorySlug: Slug;
  /** Selling price in BDT (whole taka — no paisa in retail here). */
  price: number;
  /** Was-price in BDT. Present only when genuinely discounted. */
  compareAtPrice: number | null;
  image: ImageRef;
  /** Second image revealed on hover/focus. */
  hoverImage: ImageRef | null;
  /** Further photographs, in the order the shop set. Main and hover excluded. */
  gallery: ImageRef[];
  /** Drives the single corner badge. Only one badge ever shows. */
  badge: ProductBadge | null;
  /** Free delivery threshold is global, but some items always ship free. */
  freeDelivery: boolean;
  /** Derived: true when any variant has stock. */
  inStock: boolean;
  colors: string[];
  /** Sizes that exist, in display order. Includes sold-out ones. */
  sizes: string[];
  variants: ProductVariant[];

  /* --- Product detail page ------------------------------------------------ */

  /** Stock keeping unit, shown on the detail page and used in structured data. */
  sku: string;
  /** Plain text, derived. Used for search, metadata and structured data. */
  description: string;
  /** The same words with their formatting, for the page itself. */
  descriptionRich: import("@/types/rich-text").RichText;
  /** Scannable specifics — fabric, fit, care. Shoppers read these, not prose. */
  details: string[];
}

export interface PromoTile {
  title: string;
  subtitle: string;
  href: string;
  image: ImageRef;
  cta: string;
}

/**
 * A hero banner.
 *
 * Any headline, price or call-to-action is part of the artwork itself — the
 * app renders no text over the image. Two consequences the admin UI has to
 * enforce, because nothing else can:
 *
 *  1. Two files per slide, and the sizes are not interchangeable:
 *       - desktop  **1920 x 600**  (3.2:1) — 450px tall on a 1440 screen
 *       - mobile   **1000 x 700**  (10:7) — 273px tall on a 390 screen
 *     A phone would have to letterbox a 3.2:1 banner into a thin strip, and a
 *     desktop showing the mobile crop would tower over the fold; each viewport
 *     gets artwork drawn for its own shape. Within a breakpoint every slide
 *     must match, or the track changes height as it scrolls. Nothing is ever
 *     cropped, so the wording in the artwork always survives.
 *  2. `alt` has to carry whatever the artwork says, word for word where it
 *     matters. It is the only version of that message available to a screen
 *     reader or to Google.
 */
export interface HeroSlide {
  id: string;
  /** Desktop / tablet banner, 1920 x 600. */
  image: ImageRef;
  /** Phone banner, 1000 x 700. Swapped in below 768px. */
  imageMobile: ImageRef;
  /** The banner's own wording. Not a description of the photo. */
  alt: string;
  /** Where tapping the banner goes. */
  href: string;
  /** Short label for the dot control, e.g. "New season". */
  label: string;
}

export interface SizeChart {
  id: string;
  title: string;
  note: string;
  columns: string[];
  rows: string[][];
}

/**
 * The menus.
 *
 * Here rather than beside the query that reads them, because the mobile menu
 * is a Client Component. A type-only import is erased by TypeScript, but the
 * bundler still resolves the module — so importing this from `lib/catalog.ts`
 * would pull Prisma into the browser bundle and the chunk would fail to build.
 */
export interface NavLink {
  label: string;
  href: string;
  highlight?: boolean;
}

export interface SiteNav {
  primary: NavLink[];
  help: NavLink[];
  company: NavLink[];
}
