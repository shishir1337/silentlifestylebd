import "server-only";

import { getAllProducts, getCategories } from "@/lib/catalog";
import type { Category, Product } from "@/types/catalog";

/**
 * Catalogue search.
 *
 * A scored substring match over the fields a shopper actually types into a
 * search box. Deliberately not fuzzy: with a catalogue this size, a typo-
 * tolerant matcher returns confident nonsense far more often than it rescues a
 * near-miss, and "no results" with good suggestions beats the wrong product.
 *
 * Scoring runs in the server process against the cached product list rather
 * than in SQL. With a catalogue of this size that is faster than a query — the
 * list is already in memory for every other page — and it keeps the ranking
 * rules readable. Swapping in a real search service means replacing
 * `searchProducts` and nothing else.
 */

const MIN_QUERY = 2;

/** Words worth ignoring — they match everything and rank nothing. */
const STOP_WORDS = new Set(["a", "an", "the", "for", "and", "of", "in", "bd"]);

export function normaliseQuery(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function tokenise(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function categoryNameLookup(categories: Category[]) {
  return new Map(categories.map((c) => [c.slug, c.name.toLowerCase()]));
}

function scoreProduct(
  product: Product,
  query: string,
  tokens: string[],
  categoryNames: Map<string, string>,
): number {
  const name = product.name.toLowerCase();
  const category = categoryNames.get(product.categorySlug) ?? product.categorySlug;
  const description = product.description.toLowerCase();
  const extras = [
    ...(product.colors ?? []),
    ...(product.sizes ?? []),
    ...product.details,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  // A whole-phrase hit in the title is the strongest signal there is.
  if (name.includes(query.toLowerCase())) score += 20;

  for (const token of tokens) {
    if (name.startsWith(token)) score += 8;
    else if (name.includes(token)) score += 6;

    if (category.includes(token)) score += 4;
    if (product.categorySlug.includes(token)) score += 4;
    if (description.includes(token)) score += 2;
    if (extras.includes(token)) score += 1;
  }

  // Every token has to land somewhere, or "red panjabi" would return every
  // panjabi in the shop regardless of colour.
  const matchedAll = tokens.every(
    (t) =>
      name.includes(t) ||
      category.includes(t) ||
      product.categorySlug.includes(t) ||
      description.includes(t) ||
      extras.includes(t),
  );
  if (!matchedAll) return 0;

  // Nudge in-stock items up; a perfect match nobody can buy is a dead end.
  if (product.inStock) score += 1;

  return score;
}

export interface SearchResult {
  query: string;
  /** True when the query was blank or too short to run. */
  tooShort: boolean;
  products: Product[];
  /** Categories whose name matches, offered as a shortcut above the results. */
  categories: Category[];
}

export async function searchProducts(raw: string | undefined): Promise<SearchResult> {
  const query = normaliseQuery(raw);
  const tokens = tokenise(query);

  if (query.length < MIN_QUERY || tokens.length === 0) {
    return { query, tooShort: true, products: [], categories: [] };
  }

  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);
  const categoryNames = categoryNameLookup(categories);

  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(p, query, tokens, categoryNames) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const matchingCategories = categories.filter((c) =>
    tokens.some(
      (t) => c.name.toLowerCase().includes(t) || c.slug.includes(t),
    ),
  );

  return {
    query,
    tooShort: false,
    products: scored.map((s) => s.product),
    categories: matchingCategories,
  };
}

/** Shown on an empty or fruitless search — the things people actually look for. */
export const POPULAR_SEARCHES = [
  "Panjabi",
  "Formal shirt",
  "T-shirt",
  "Gabardine pant",
  "Watch",
  "Leather belt",
  "Wallet",
  "Pakistani",
] as const;
