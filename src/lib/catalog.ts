import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type {
  Category,
  HeroSlide,
  ImageRef,
  Product,
  ProductBadge,
  PromoTile,
  SizeChart,
} from "@/types/catalog";

/**
 * Read layer over the catalogue.
 *
 * Every storefront read goes through here; no route or component touches Prisma
 * directly. That was already true of the in-memory version this replaces, which
 * is why moving to a database changed no page's data flow — only the fact that
 * these functions are now async.
 *
 * ## Caching
 *
 * Reads are wrapped in `unstable_cache` and tagged, so product and collection
 * pages keep prerendering as static HTML. Admin mutations call
 * `revalidateTag(tag, 'max')` to regenerate exactly what changed.
 *
 * `use cache` was considered and rejected (plan decision A3): its entries are
 * keyed by build ID and so die on every deploy, and it cannot read cookies
 * anywhere in its call stack — a restriction that surfaces at runtime, not at
 * build.
 */

export const CATALOG_TAG = "catalog";
export const PRODUCTS_TAG = "products";
export const CATEGORIES_TAG = "categories";
export const CONTENT_TAG = "content";

/** One year. Invalidation is by tag, not by clock. */
const CACHE = { revalidate: 31_536_000 } as const;

/* --- shaping ------------------------------------------------------------- */

type AssetRow = {
  url: string;
  width: number;
  height: number;
  blurDataURL: string | null;
  alt: string | null;
};

function toImage(asset: AssetRow | null | undefined): ImageRef | null {
  if (!asset) return null;
  return {
    url: asset.url,
    width: asset.width,
    height: asset.height,
    blurDataURL: asset.blurDataURL,
    alt: asset.alt,
  };
}

/** The include every product read shares, so the shapes cannot drift apart. */
const productInclude = {
  category: { select: { slug: true } },
  details: { orderBy: { position: "asc" } },
  colors: { orderBy: { position: "asc" } },
  variants: { orderBy: { position: "asc" } },
  images: { orderBy: { position: "asc" }, include: { asset: true } },
} as const;

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  badge: "NEW" | "BESTSELLER" | "LIMITED" | null;
  freeDelivery: boolean;
  category: { slug: string };
  details: { text: string }[];
  colors: { name: string }[];
  variants: { size: string; stock: number }[];
  images: { role: string; asset: AssetRow }[];
};

function toProduct(row: ProductRow): Product {
  const primary = row.images.find((i) => i.role === "PRIMARY") ?? row.images[0];
  const hover = row.images.find((i) => i.role === "HOVER");

  if (!primary) {
    throw new Error(`Product "${row.slug}" has no image. Every product needs one.`);
  }

  const variants = row.variants.map((v) => ({ size: v.size, stock: v.stock }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categorySlug: row.category.slug,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    image: toImage(primary.asset)!,
    hoverImage: toImage(hover?.asset),
    badge: row.badge ? (row.badge.toLowerCase() as ProductBadge) : null,
    freeDelivery: row.freeDelivery,
    // Derived, not stored: a product is buyable when some size is.
    inStock: variants.some((v) => v.stock > 0),
    colors: row.colors.map((c) => c.name),
    // The empty-string size is the "sold without a size" sentinel, not a label.
    sizes: variants.map((v) => v.size).filter((s) => s.length > 0),
    variants,
    sku: row.sku,
    description: row.description,
    details: row.details.map((d) => d.text),
  };
}

/* --- products ------------------------------------------------------------ */

export const getProduct = unstable_cache(
  async (slug: string): Promise<Product | undefined> => {
    const row = await db.product.findFirst({
      where: { slug, isActive: true },
      include: productInclude,
    });
    return row ? toProduct(row as unknown as ProductRow) : undefined;
  },
  ["catalog:product"],
  { ...CACHE, tags: [CATALOG_TAG, PRODUCTS_TAG] },
);

export const allProductSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await db.product.findMany({
      where: { isActive: true },
      select: { slug: true },
      orderBy: { position: "asc" },
    });
    return rows.map((r) => r.slug);
  },
  ["catalog:product-slugs"],
  { ...CACHE, tags: [CATALOG_TAG, PRODUCTS_TAG] },
);

/** All active products in merchandised order — the basis of every listing. */
export const getAllProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await db.product.findMany({
      where: { isActive: true },
      include: productInclude,
      orderBy: { position: "asc" },
    });
    return rows.map((r) => toProduct(r as unknown as ProductRow));
  },
  ["catalog:all-products"],
  { ...CACHE, tags: [CATALOG_TAG, PRODUCTS_TAG] },
);

/* --- categories ---------------------------------------------------------- */

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const rows = await db.category.findMany({
      where: { isActive: true },
      include: { image: true },
      orderBy: { position: "asc" },
    });
    return rows.map((c) => ({
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      image: toImage(c.image),
    }));
  },
  ["catalog:categories"],
  { ...CACHE, tags: [CATALOG_TAG, CATEGORIES_TAG] },
);

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

/**
 * Product counts per category — derived, never stored.
 *
 * These used to be hand-written numbers ("64 items" against a catalogue holding
 * one). A count the listing page can contradict is worse than no count at all.
 */
export const getCategoryCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const [grouped, categories] = await Promise.all([
      db.product.groupBy({
        by: ["categoryId"],
        where: { isActive: true },
        _count: { _all: true },
      }),
      db.category.findMany({ select: { id: true, slug: true } }),
    ]);
    const bySlug: Record<string, number> = {};
    for (const c of categories) {
      bySlug[c.slug] = grouped.find((g) => g.categoryId === c.id)?._count._all ?? 0;
    }
    return bySlug;
  },
  ["catalog:category-counts"],
  { ...CACHE, tags: [CATALOG_TAG, PRODUCTS_TAG, CATEGORIES_TAG] },
);

export async function countInCategory(slug: string): Promise<number> {
  return (await getCategoryCounts())[slug] ?? 0;
}

/* --- product detail helpers ---------------------------------------------- */

/**
 * Gallery for the detail page. Built from the images a product actually has
 * rather than padded with unrelated shots — one honest photo beats three that
 * turn out to be a different garment.
 */
export function getGallery(product: Product): ImageRef[] {
  const images = [product.image];
  if (product.hoverImage && product.hoverImage.url !== product.image.url) {
    images.push(product.hoverImage);
  }
  return images;
}

/**
 * Related products: same category first, then anything else in stock, so the
 * rail is never short on a thin category.
 */
export async function getRelated(product: Product, limit = 8): Promise<Product[]> {
  const products = await getAllProducts();
  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.categorySlug === product.categorySlug,
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const filler = products.filter(
    (p) => p.id !== product.id && p.categorySlug !== product.categorySlug && p.inStock,
  );
  return [...sameCategory, ...filler].slice(0, limit);
}

/* --- collections --------------------------------------------------------- */

export interface ResolvedCollection {
  slug: string;
  name: string;
  description: string;
  products: Product[];
  /** Present when the collection is a real category, for breadcrumbs. */
  isCategory: boolean;
}

const getCollectionRows = unstable_cache(
  async () => {
    const rows = await db.collection.findMany({
      where: { isActive: true },
      include: { categories: { include: { category: { select: { slug: true } } } } },
      orderBy: { position: "asc" },
    });
    return rows.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      rule: c.rule,
      categorySlugs: c.categories.map((cc) => cc.category.slug),
    }));
  },
  ["catalog:collections"],
  { ...CACHE, tags: [CATALOG_TAG, CATEGORIES_TAG] },
);

/**
 * Turns a stored collection into a predicate.
 *
 * CATEGORY collections match on membership — a join table, because the
 * groupings overlap (`watches` sits in both men and accessories). RULE
 * collections match on a product attribute and stay derived, so "new" and
 * "offers" cannot go stale the way a hand-curated list would.
 */
function predicateFor(row: {
  rule: string | null;
  categorySlugs: string[];
}): (p: Product) => boolean {
  const members = new Set(row.categorySlugs);
  return (p) => {
    switch (row.rule) {
      case "NEW":
        return p.badge === "new";
      case "BESTSELLER":
        return p.badge === "bestseller";
      case "ON_OFFER":
        return Boolean(p.compareAtPrice && p.compareAtPrice > p.price);
      default:
        return members.has(p.categorySlug);
    }
  };
}

/**
 * Resolves a collection slug to its products.
 *
 * One route serves two shapes: real categories, and the curated sets the nav
 * links to. Category slugs win on a collision, as before.
 */
export async function resolveCollection(
  slug: string,
): Promise<ResolvedCollection | undefined> {
  const [products, category] = await Promise.all([getAllProducts(), getCategory(slug)]);

  if (category) {
    return {
      slug,
      name: category.name,
      description: category.tagline ?? `Shop ${category.name.toLowerCase()}.`,
      products: products.filter((p) => p.categorySlug === slug),
      isCategory: true,
    };
  }

  const row = (await getCollectionRows()).find((c) => c.slug === slug);
  if (!row) return undefined;

  return {
    slug,
    name: row.name,
    description: row.description,
    products: products.filter(predicateFor(row)),
    isCategory: false,
  };
}

/**
 * The curated sets for the collections index, each with its product count.
 *
 * Counted here, in one pass over the product list, rather than by calling
 * `resolveCollection` once per collection — that would re-scan the catalogue
 * six times to produce six numbers.
 */
export async function getCuratedCollections(): Promise<
  { slug: string; name: string; description: string; count: number }[]
> {
  const [rows, products] = await Promise.all([getCollectionRows(), getAllProducts()]);
  return rows.map((c) => {
    const matches = predicateFor(c);
    return {
      slug: c.slug,
      name: c.name,
      description: c.description,
      count: products.filter(matches).length,
    };
  });
}

/** Every slug the collection route prerenders. */
export async function allCollectionSlugs(): Promise<string[]> {
  const [categories, collections] = await Promise.all([
    getCategories(),
    getCollectionRows(),
  ]);
  return [...categories.map((c) => c.slug), ...collections.map((c) => c.slug)];
}

/* --- homepage rails ------------------------------------------------------ */

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  // Badge-less products count as new, matching the previous behaviour.
  return (await getAllProducts())
    .filter((p) => p.badge === "new" || !p.badge)
    .slice(0, limit);
}

export async function getBestSellers(limit = 8): Promise<Product[]> {
  return (await getAllProducts()).filter((p) => p.badge === "bestseller").slice(0, limit);
}

export async function getOnOffer(limit = 8): Promise<Product[]> {
  return (await getAllProducts())
    .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
    .slice(0, limit);
}

/* --- editable content ---------------------------------------------------- */

export const getHeroSlides = unstable_cache(
  async (): Promise<HeroSlide[]> => {
    const rows = await db.heroSlide.findMany({
      where: { isActive: true },
      include: { desktopAsset: true, mobileAsset: true },
      orderBy: { position: "asc" },
    });
    return rows.map((s) => ({
      id: s.id,
      image: toImage(s.desktopAsset)!,
      imageMobile: toImage(s.mobileAsset)!,
      alt: s.alt,
      href: s.href,
      label: s.label,
    }));
  },
  ["content:hero-slides"],
  { ...CACHE, tags: [CONTENT_TAG] },
);

export const getPromoTiles = unstable_cache(
  async (): Promise<PromoTile[]> => {
    const rows = await db.promoTile.findMany({
      where: { isActive: true },
      include: { asset: true },
      orderBy: { position: "asc" },
    });
    return rows.map((t) => ({
      title: t.title,
      subtitle: t.subtitle,
      href: t.href,
      cta: t.cta,
      image: toImage(t.asset)!,
    }));
  },
  ["content:promo-tiles"],
  { ...CACHE, tags: [CONTENT_TAG] },
);

export const getSizeCharts = unstable_cache(
  async (): Promise<SizeChart[]> => {
    const rows = await db.sizeChart.findMany({
      where: { isActive: true },
      include: { rows: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    });
    return rows.map((c) => ({
      id: c.slug,
      title: c.title,
      note: c.note,
      columns: c.columns,
      rows: c.rows.map((r) => r.cells),
    }));
  },
  ["content:size-charts"],
  { ...CACHE, tags: [CONTENT_TAG] },
);
