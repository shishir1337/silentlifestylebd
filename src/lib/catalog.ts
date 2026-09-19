import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { posterFor } from "@/lib/image";
import { freeDeliveryOffered } from "@/lib/orders";
import { fromPlainText, toRichText } from "@/lib/rich-text";
import type {
  Category,
  HeroSlide,
  ImageRef,
  NavLink,
  Product,
  ProductBadge,
  PromoTile,
  SiteNav,
  SizeChart,
} from "@/types/catalog";

export type { NavLink, SiteNav } from "@/types/catalog";

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

/**
 * Bumped whenever the *shape* of a cached value changes.
 *
 * `unstable_cache` entries deliberately survive a deploy — that is why the
 * legacy caching model was chosen over `use cache`, which keys on the build id.
 * The cost is that a release which adds a field to `Product` will, for a
 * while, be served objects written by the release before it. One such field
 * arriving as `undefined` inside a `.map` or a spread is a 500 on the
 * homepage, not a missing line of text.
 *
 * Changing this string is part of changing a shape. It is not a version of the
 * data and it does not need to go up for a price edit — only when the
 * interface the cache holds is different from the one the code expects.
 */
/*
  Bumped to v3 for video: an `ImageRef` cached under v2 has no `kind`, and
  while the readers all treat a missing kind as a picture, a product whose
  gallery gained a video would otherwise keep serving the old entry until
  something else invalidated it.
*/
const SHAPE = "v3";

export const CATALOG_TAG = "catalog";
export const PRODUCTS_TAG = "products";
export const CATEGORIES_TAG = "categories";
export const CONTENT_TAG = "content";

/** One year. Invalidation is by tag, not by clock. */
const CACHE = { revalidate: 31_536_000 } as const;

/* --- shaping ------------------------------------------------------------- */

type AssetRow = {
  url: string;
  kind: "IMAGE" | "VIDEO";
  width: number;
  height: number;
  durationSeconds: number | null;
  blurDataURL: string | null;
  alt: string | null;
};

function toImage(asset: AssetRow | null | undefined): ImageRef | null {
  if (!asset) return null;
  const video = asset.kind === "VIDEO";
  return {
    url: asset.url,
    width: asset.width,
    height: asset.height,
    blurDataURL: asset.blurDataURL,
    alt: asset.alt,
    kind: asset.kind,
    /*
      Derived here rather than stored. The poster is a pure function of the
      video's URL, so a column would be a second copy of the same fact with its
      own way of going stale — see `posterFor`.
    */
    poster: video ? posterFor(asset.url) : null,
    durationSeconds: asset.durationSeconds,
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
  descriptionRich: unknown;
  details: { text: string }[];
  colors: { name: string }[];
  variants: { size: string; stock: number }[];
  images: { role: string; asset: AssetRow }[];
};

function toProduct(row: ProductRow): Product {
  const primary = row.images.find((i) => i.role === "PRIMARY") ?? row.images[0];
  const hover = row.images.find((i) => i.role === "HOVER");
  const gallery = row.images.filter((i) => i.role === "GALLERY");

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
    gallery: gallery.map((g) => toImage(g.asset)!),
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
    // Products written before the editor keep their one paragraph; the shape
    // is the same either way, so the page needs no special case.
    descriptionRich: row.descriptionRich
      ? toRichText(row.descriptionRich)
      : fromPlainText(row.description),
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
  ["catalog:product", SHAPE],
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
  ["catalog:product-slugs", SHAPE],
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
  ["catalog:all-products", SHAPE],
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
  ["catalog:categories", SHAPE],
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
  ["catalog:category-counts", SHAPE],
  { ...CACHE, tags: [CATALOG_TAG, PRODUCTS_TAG, CATEGORIES_TAG] },
);

export async function countInCategory(slug: string): Promise<number> {
  return (await getCategoryCounts())[slug] ?? 0;
}

/* --- product detail helpers ---------------------------------------------- */

/**
 * Gallery for the detail page.
 *
 * Built from the images a product actually has rather than padded with
 * unrelated shots — one honest photo beats three that turn out to be a
 * different garment.
 *
 * De-duplicated on URL. The same asset can legitimately be both the main
 * picture and a category image elsewhere, and the client reusing one inside a
 * single product would otherwise put the same photograph in two thumbnails and
 * make the gallery look broken.
 */
export function getGallery(product: Product): ImageRef[] {
  const images: ImageRef[] = [];
  const seen = new Set<string>();

  // `?? []` rather than a bare spread: an entry cached by an earlier release
  // has no gallery at all, and a product page is not worth a 500.
  for (const img of [product.image, product.hoverImage, ...(product.gallery ?? [])]) {
    if (!img || seen.has(img.url)) continue;
    seen.add(img.url);
    images.push(img);
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
  ["catalog:collections", SHAPE],
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
  ["content:hero-slides", SHAPE],
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
  ["content:promo-tiles", SHAPE],
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
  ["content:size-charts", SHAPE],
  { ...CACHE, tags: [CONTENT_TAG] },
);

/**
 * The one chart that applies to a category, or null when none does.
 *
 * The product page used to link to `/size-guide`, which is every chart the
 * shop has, one after another. Somebody deciding between M and L on a shirt
 * was sent away from the page they were buying on, to a page that opened on
 * panjabi chest measurements, and had to find the right table themselves —
 * then find their way back. Most of them did not come back.
 *
 * Tagged with the content tag like every other chart read, so editing a chart
 * in the admin updates it on every product page that shows it.
 */
export const getSizeChartForCategory = unstable_cache(
  async (categorySlug: string): Promise<SizeChart | null> => {
    const category = await db.category.findUnique({
      where: { slug: categorySlug },
      select: {
        sizeChart: {
          include: { rows: { orderBy: { position: "asc" } } },
        },
      },
    });

    const chart = category?.sizeChart;
    // An inactive chart is one the client has taken down on purpose.
    if (!chart?.isActive) return null;

    return {
      id: chart.slug,
      title: chart.title,
      note: chart.note,
      columns: chart.columns,
      rows: chart.rows.map((r) => r.cells),
    };
  },
  ["content:size-chart-for-category", SHAPE],
  /*
    Two tags, because two different edits change this answer.

    `content` covers editing the chart itself — a measurement corrected in the
    size-chart editor. `categories` covers pointing a category at a different
    chart, which is a category edit and would otherwise leave every product
    page in that category showing the old table until something else happened
    to invalidate it. Both product pages are prerendered, so a stale read here
    is a stale page, not just a stale function.
  */
  { ...CACHE, tags: [CONTENT_TAG, CATEGORIES_TAG] },
);

/**
 * The menus.
 *
 * Shaped like the constant it replaces — three named groups of links — so the
 * header, footer and mobile menu did not have to change how they read it, only
 * where it comes from. Stage 4 gave the client an editor for these rows; until
 * this existed, that editor wrote to a table nothing rendered.
 */
export const getNav = unstable_cache(
  async (): Promise<SiteNav> => {
    const rows = await db.navItem.findMany({
      where: { isActive: true },
      orderBy: [{ group: "asc" }, { position: "asc" }],
    });

    const pick = (group: "PRIMARY" | "HELP" | "COMPANY"): NavLink[] =>
      rows
        .filter((r) => r.group === group)
        .map((r) => ({
          label: r.label,
          href: r.href,
          ...(r.highlight ? { highlight: true } : {}),
        }));

    return { primary: pick("PRIMARY"), help: pick("HELP"), company: pick("COMPANY") };
  },
  ["content:nav", SHAPE],
  { ...CACHE, tags: [CONTENT_TAG] },
);

/**
 * Everything with its own address, and when it last changed.
 *
 * For the sitemap. `lastModified` is the row's own `updatedAt` rather than the
 * time the file was generated — a sitemap that reports every page as modified
 * today teaches a crawler to ignore the field, and then a genuine price change
 * takes as long to be noticed as a typo fix.
 *
 * Hidden products and inactive collections are left out. A crawler that
 * follows a sitemap entry to a 404 has been sent somewhere the shop said
 * existed, which is worse than not listing it.
 */
export interface SitemapEntry {
  path: string;
  lastModified: Date;
}

export const getSitemapEntries = unstable_cache(
  async (): Promise<SitemapEntry[]> => {
    const [products, categories, collections] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { position: "asc" },
      }),
      db.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { position: "asc" },
      }),
      db.collection.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { position: "asc" },
      }),
    ]);

    /*
      Categories and collections share the /collections/ space, and a category
      can carry the same slug as a collection. Listing an address twice is a
      malformed sitemap, so the first one wins.
    */
    const seen = new Set<string>();
    const groups: SitemapEntry[] = [];
    for (const row of [...categories, ...collections]) {
      const path = `/collections/${row.slug}`;
      if (seen.has(path)) continue;
      seen.add(path);
      groups.push({ path, lastModified: row.updatedAt });
    }

    return [
      ...products.map((p) => ({ path: `/products/${p.slug}`, lastModified: p.updatedAt })),
      ...groups,
    ];
  },
  ["catalog:sitemap", SHAPE],
  { ...CACHE, tags: [CATALOG_TAG, PRODUCTS_TAG, CATEGORIES_TAG] },
);

/**
 * The strip above the header.
 *
 * Placeholders are substituted here rather than stored resolved, so a change
 * to the delivery charge reaches the strip along with everything else. A shop
 * that edits "free over Tk 3,000" into the text by hand has made a second copy
 * of a number the settings already own, and the two will disagree the first
 * time one of them changes.
 */
export interface Announcement {
  id: string;
  text: string;
  icon: "NONE" | "CASH" | "TRUCK" | "RETURN" | "SHIELD";
  href: string | null;
  wideOnly: boolean;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const [rows, settings] = await Promise.all([
    getAnnouncementRows(),
    (await import("@/lib/settings")).getSiteSettings(),
  ]);

  const money = (n: number) => `৳${n.toLocaleString("en-US")}`;
  const tokens: Record<string, string> = {
    "{free-over}": money(settings.delivery.freeThreshold),
    "{inside-dhaka}": money(settings.delivery.insideDhaka),
    "{outside-dhaka}": money(settings.delivery.outsideDhaka),
    "{phone}": settings.phoneDisplay,
  };

  return rows
    /*
      An announcement about an offer that is not running does not run either.

      "Free delivery over {free-over}" is the client's own sentence, and with
      the threshold at zero it would render as "Free delivery over ৳0" across
      the top of every page — an offer the shop has just switched off, stated
      in a way that is also nonsense. Dropping the strip is the only reading
      that is true, and the row stays in the admin so turning the threshold
      back on brings the message back with it.
    */
    .filter((row) => freeDeliveryOffered(settings.delivery) || !row.text.includes("{free-over}"))
    .map((row) => ({
      ...row,
      text: row.text.replace(
        /\{(free-over|inside-dhaka|outside-dhaka|phone)\}/g,
        (match) => tokens[match] ?? match,
      ),
    }));
}

const getAnnouncementRows = unstable_cache(
  async (): Promise<Announcement[]> => {
    const rows = await db.announcement.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { id: true, text: true, icon: true, href: true, wideOnly: true },
    });
    return rows;
  },
  ["content:announcements"],
  { ...CACHE, tags: [CONTENT_TAG] },
);
