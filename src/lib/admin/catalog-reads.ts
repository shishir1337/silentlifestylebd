import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fromPlainText, toRichText } from "@/lib/rich-text";

/**
 * Catalogue reads for the admin panel.
 *
 * Deliberately uncached, and deliberately separate from `lib/catalog.ts`.
 *
 * The storefront's reads are wrapped in `unstable_cache` so product pages can
 * be prerendered — which is exactly wrong here. An operator who changes a price
 * and sees the old one has no way to tell a slow cache from a failed save, and
 * the second thing they will do is change it again. The admin always reads the
 * database.
 *
 * They also show different things: unpublished products, zero-stock variants
 * and empty categories are all hidden from shoppers and are precisely what the
 * person managing the shop needs to see.
 */

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  position: number;
  badge: "NEW" | "BESTSELLER" | "LIMITED" | null;
  categoryName: string;
  categorySlug: string;
  /** Summed across sizes — the number the shop floor actually cares about. */
  totalStock: number;
  /** Sizes at zero, so a half-sold-out product is visible at a glance. */
  soldOutSizes: string[];
  /** Carried so stock can be corrected from the list without opening the editor. */
  variants: { id: string; size: string; stock: number }[];
  imageUrl: string | null;
}

export const PRODUCT_PER_PAGE = 25;

export type ProductSort = "position" | "name" | "price-asc" | "price-desc" | "stock";
export type StockFilter = "all" | "out" | "low";

export interface ProductQuery {
  q?: string;
  category?: string;
  status?: "all" | "live" | "hidden";
  stock?: StockFilter;
  sort?: ProductSort;
  page?: number;
}

export interface ProductListResult {
  rows: AdminProductRow[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Products, filtered and paged in Postgres.
 *
 * This used to load every product and filter the array. Sixteen products made
 * that invisible; a client who grows to a few thousand would find the page
 * slower every month with nothing to point at. The one thing still counted in
 * memory is total stock, because it is a sum across a relation that Prisma
 * cannot order by — see the note on sorting below.
 */
export async function listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const q = query.q?.trim();

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (query.category && query.category !== "all") {
    where.category = { slug: query.category };
  }
  if (query.status === "live") where.isActive = true;
  if (query.status === "hidden") where.isActive = false;
  if (query.stock === "out") where.variants = { every: { stock: { lte: 0 } } };
  if (query.stock === "low") where.variants = { some: { stock: { gt: 0, lte: 5 } } };

  /**
   * Sorting by total stock is deliberately absent from the database query.
   *
   * It is a sum over a relation, which Prisma cannot order by, and the SQL to
   * do it properly would defeat the paging. The "stock" sort therefore orders
   * the current page rather than the whole catalogue — which is what somebody
   * scanning a filtered list actually wants, and it is honest about its scope
   * because the filter beside it ("Out of stock", "Running low") does the
   * catalogue-wide version.
   */
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "name"
      ? { name: "asc" }
      : query.sort === "price-asc"
        ? { price: "asc" }
        : query.sort === "price-desc"
          ? { price: "desc" }
          : { position: "asc" };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: query.sort ? orderBy : [{ isActive: "desc" }, { position: "asc" }],
      skip: (page - 1) * PRODUCT_PER_PAGE,
      take: PRODUCT_PER_PAGE,
      select: {
        id: true,
        slug: true,
        name: true,
        sku: true,
        price: true,
        compareAtPrice: true,
        isActive: true,
        position: true,
        badge: true,
        category: { select: { name: true, slug: true } },
        variants: {
          orderBy: { position: "asc" },
          select: { id: true, size: true, stock: true },
        },
        images: {
          where: { role: "PRIMARY" },
          take: 1,
          select: { asset: { select: { url: true } } },
        },
      },
    }),
    db.product.count({ where }),
  ]);

  const mapped = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    isActive: p.isActive,
    position: p.position,
    badge: p.badge,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    totalStock: p.variants.reduce((n, v) => n + v.stock, 0),
    soldOutSizes: p.variants.filter((v) => v.stock <= 0 && v.size).map((v) => v.size),
    variants: p.variants,
    imageUrl: p.images[0]?.asset.url ?? null,
  }));

  if (query.sort === "stock") mapped.sort((a, b) => a.totalStock - b.totalStock);

  return {
    rows: mapped,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PRODUCT_PER_PAGE)),
  };
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  compareAtPrice: number | null;
  description: import("@/types/rich-text").RichText;
  badge: "NEW" | "BESTSELLER" | "LIMITED" | null;
  freeDelivery: boolean;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  details: string[];
  colors: string[];
  variants: { id: string; size: string; stock: number }[];
  primaryAssetId: string | null;
  hoverAssetId: string | null;
  galleryAssetIds: string[];
}

export async function getProduct(id: string): Promise<AdminProductDetail | null> {
  const p = await db.product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      categoryId: true,
      price: true,
      compareAtPrice: true,
      description: true,
      descriptionRich: true,
      badge: true,
      freeDelivery: true,
      isActive: true,
      seoTitle: true,
      seoDescription: true,
      details: { orderBy: { position: "asc" }, select: { text: true } },
      colors: { orderBy: { position: "asc" }, select: { name: true } },
      variants: {
        orderBy: { position: "asc" },
        select: { id: true, size: true, stock: true },
      },
      images: {
        select: { role: true, assetId: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!p) return null;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    // Products written before the editor have no rich column; their one
    // paragraph is lifted into the new shape so the form opens with words in it.
    description: p.descriptionRich
      ? toRichText(p.descriptionRich)
      : fromPlainText(p.description),
    badge: p.badge,
    freeDelivery: p.freeDelivery,
    isActive: p.isActive,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    details: p.details.map((d) => d.text),
    colors: p.colors.map((c) => c.name),
    variants: p.variants,
    primaryAssetId: p.images.find((i) => i.role === "PRIMARY")?.assetId ?? null,
    hoverAssetId: p.images.find((i) => i.role === "HOVER")?.assetId ?? null,
    galleryAssetIds: p.images.filter((i) => i.role === "GALLERY").map((i) => i.assetId),
  };
}

export interface AdminCategoryRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  position: number;
  isActive: boolean;
  imageId: string | null;
  imageUrl: string | null;
  productCount: number;
}

export async function listCategories(): Promise<AdminCategoryRow[]> {
  const rows = await db.category.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      position: true,
      isActive: true,
      imageId: true,
      image: { select: { url: true } },
      _count: { select: { products: true } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    position: c.position,
    isActive: c.isActive,
    imageId: c.imageId,
    imageUrl: c.image?.url ?? null,
    productCount: c._count.products,
  }));
}

export interface AssetRow {
  id: string;
  url: string;
  filePath: string;
  width: number;
  height: number;
  alt: string | null;
  bytes: number;
  createdAt: string;
  /** Where it is used, so nothing is deleted out from under a live page. */
  usedBy: string[];
}

export async function listAssets(): Promise<AssetRow[]> {
  const rows = await db.asset.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      filePath: true,
      width: true,
      height: true,
      alt: true,
      bytes: true,
      createdAt: true,
      categories: { select: { name: true } },
      productImages: { select: { product: { select: { name: true } } } },
      heroDesktop: { select: { label: true } },
      heroMobile: { select: { label: true } },
      promoTiles: { select: { title: true } },
    },
  });

  return rows.map((a) => ({
    id: a.id,
    url: a.url,
    filePath: a.filePath,
    width: a.width,
    height: a.height,
    alt: a.alt,
    bytes: a.bytes,
    createdAt: a.createdAt.toISOString(),
    usedBy: [
      ...a.categories.map((c) => `Category: ${c.name}`),
      ...a.productImages.map((p) => `Product: ${p.product.name}`),
      ...a.heroDesktop.map((h) => `Banner: ${h.label}`),
      ...a.heroMobile.map((h) => `Banner: ${h.label} (mobile)`),
      ...a.promoTiles.map((t) => `Tile: ${t.title}`),
    ],
  }));
}

/** Counts for the admin overview. One query per box, all trivially indexed. */
export async function getAdminCounts() {
  const [products, hidden, categories, outOfStock, pendingOrders, assets] =
    await Promise.all([
      db.product.count(),
      db.product.count({ where: { isActive: false } }),
      db.category.count(),
      db.product.count({ where: { variants: { every: { stock: { lte: 0 } } } } }),
      db.order.count({ where: { status: "PENDING" } }),
      db.asset.count(),
    ]);

  return { products, hidden, categories, outOfStock, pendingOrders, assets };
}

/**
 * The dashboard feed.
 *
 * Deliberately answers what an operator opening this at 9am actually asks:
 * what needs doing, what sold, what is about to run out. Counts alone make a
 * pretty screen nobody acts on.
 */
export async function getDashboardFeed() {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const [pending, delivered, today, recent, lowStockRows] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "DELIVERED" } }),
    db.order.aggregate({
      where: { placedAt: { gte: midnight } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 6,
      select: {
        orderNo: true,
        customerName: true,
        status: true,
        total: true,
        placedAt: true,
      },
    }),
    /**
     * Products worth looking at before they embarrass anyone: nothing left at
     * all, or down to the last few. Only published ones — a hidden product
     * running out is not a problem anybody needs to hear about.
     */
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, variants: { select: { stock: true } } },
    }),
  ]);

  const lowStock = lowStockRows
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalStock: p.variants.reduce((n, v) => n + v.stock, 0),
    }))
    .filter((p) => p.totalStock <= 5)
    .sort((a, b) => a.totalStock - b.totalStock)
    .slice(0, 6);

  return {
    pending,
    delivered,
    ordersToday: today._count._all,
    salesToday: today._sum.total ?? 0,
    recent: recent.map((o) => ({ ...o, placedAt: o.placedAt.toISOString() })),
    lowStock,
  };
}
