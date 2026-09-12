import type { StaticImageData } from "next/image";
import { products } from "@/data/products";
import { categories, categoryBySlug } from "@/data/categories";
import { curatedBySlug, curatedCollections } from "@/data/collections";
import type { Product } from "@/types/catalog";

/**
 * Read helpers over the catalogue.
 *
 * Everything here is a pure lookup against the in-memory array, which is what
 * lets the product and collection routes prerender. When this is swapped for a
 * CMS or database, these are the only functions that need to change — no route
 * or component reaches into `products` directly.
 */

const bySlug = new Map(products.map((p) => [p.slug, p]));

export function getProduct(slug: string): Product | undefined {
  return bySlug.get(slug);
}

export function allProductSlugs(): string[] {
  return products.map((p) => p.slug);
}

export function getCategory(slug: string) {
  return categoryBySlug.get(slug);
}

/**
 * Live product counts, derived rather than stored.
 *
 * These used to be hand-written numbers on each category — "64 items" against
 * a catalogue that held one. A count the listing page can contradict is worse
 * than no count at all, so it is computed from the same array the listing
 * renders and cannot drift.
 */
const countByCategory = products.reduce<Record<string, number>>((acc, p) => {
  acc[p.categorySlug] = (acc[p.categorySlug] ?? 0) + 1;
  return acc;
}, {});

export function countInCategory(slug: string): number {
  return countByCategory[slug] ?? 0;
}

/**
 * Gallery for the detail page. Built from the images a product actually has
 * rather than padded with unrelated shots — one honest photo beats three
 * that turn out to be a different garment.
 */
export function getGallery(product: Product): StaticImageData[] {
  const images = [product.image];
  if (product.hoverImage && product.hoverImage.src !== product.image.src) {
    images.push(product.hoverImage);
  }
  return images;
}

/**
 * Related products: same category first, then anything else in stock, so the
 * rail is never short on a thin category.
 */
export function getRelated(product: Product, limit = 8): Product[] {
  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.categorySlug === product.categorySlug,
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const filler = products.filter(
    (p) => p.id !== product.id && p.categorySlug !== product.categorySlug && p.inStock,
  );
  return [...sameCategory, ...filler].slice(0, limit);
}

/* --- Collections --------------------------------------------------------- */

export interface ResolvedCollection {
  slug: string;
  name: string;
  description: string;
  products: Product[];
  /** Present when the collection is a real category, for breadcrumbs. */
  isCategory: boolean;
}

/**
 * Resolves a collection slug to its products.
 *
 * One route serves two shapes: real categories from `categories.ts`, and the
 * curated sets (men, women, new, offers, bestsellers) that the nav links to.
 * Returning a single type keeps the page from branching on which kind it got.
 */
export function resolveCollection(slug: string): ResolvedCollection | undefined {
  const category = categoryBySlug.get(slug);
  if (category) {
    return {
      slug,
      name: category.name,
      description: category.tagline ?? `Shop ${category.name.toLowerCase()}.`,
      products: products.filter((p) => p.categorySlug === slug),
      isCategory: true,
    };
  }

  const curated = curatedBySlug.get(slug);
  if (curated) {
    return {
      slug,
      name: curated.name,
      description: curated.description,
      products: products.filter(curated.match),
      isCategory: false,
    };
  }

  return undefined;
}

/** Every slug this route must prerender. */
export function allCollectionSlugs(): string[] {
  return [
    ...categories.map((c) => c.slug),
    ...curatedCollections.map((c) => c.slug),
  ];
}
