import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { CollectionResults } from "@/components/collection/collection-results";
import { ButtonLink } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import {
  allCollectionSlugs,
  getCategories,
  getCategoryCounts,
  resolveCollection,
} from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { site } from "@/data/site";

/**
 * Collection listing.
 *
 * One route serves every category slug and every curated set (men, women, new,
 * offers, bestsellers). All are known at build time and every one prerenders as
 * static HTML.
 *
 * Sorting is deliberately *not* read from `searchParams` here: doing so marks
 * the route dynamic and turns 18 cacheable pages into on-demand renders. The
 * cards are rendered on the server and reordered on the client instead — see
 * `CollectionResults`.
 */
export async function generateStaticParams() {
  return (await allCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const collection = await resolveCollection(slug);
  if (!collection) return { title: "Collection not found" };

  return {
    title: collection.name,
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

export default async function CollectionPage(
  props: PageProps<"/collections/[slug]">,
) {
  const { slug } = await props.params;
  const collection = await resolveCollection(slug);
  if (!collection) notFound();

  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
  ]);
  const items = collection.products;

  return (
    <Container>
      <nav aria-label="Breadcrumb" className="py-4">
        <ol className="flex flex-wrap items-center gap-1 text-[12px] text-ink-muted">
          <li className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] transition-colors duration-[var(--dur-base)] hover:text-ink"
            >
              Home
            </Link>
            <ChevronRightIcon aria-hidden className="size-3.5 text-line-strong" />
          </li>
          <li className="flex items-center gap-1">
            <Link
              href="/collections"
              className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] transition-colors duration-[var(--dur-base)] hover:text-ink"
            >
              Collections
            </Link>
            <ChevronRightIcon aria-hidden className="size-3.5 text-line-strong" />
          </li>
          <li>
            <span aria-current="page" className="inline-flex min-h-6 items-center text-ink-soft">
              {collection.name}
            </span>
          </li>
        </ol>
      </nav>

      <header className="pb-4">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[34px]">
          {collection.name}
        </h1>
        <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
          {collection.description}
        </p>
      </header>

      {/* Quick switch between categories — on a phone this is the difference
          between finding the next category and going back to the homepage. */}
      <nav aria-label="Categories" className="border-t border-line pt-3">
        <ul className="rail rail-bleed gap-2 pb-1 sm:flex sm:flex-wrap sm:overflow-visible">
          {categories.map((c) => {
            const active = c.slug === collection.slug;
            return (
              <li key={c.slug}>
                <Link
                  href={`/collections/${c.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-[var(--dur-base)]",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-line-strong bg-surface text-ink-soft hover:border-ink hover:text-ink",
                  )}
                >
                  {c.name}
                  <span className={cn("tabular text-[11px]", active ? "text-white/70" : "text-ink-muted")}>
                    {counts[c.slug] ?? 0}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-[17px] font-medium">Nothing here yet</p>
          <p className="max-w-sm text-[14px] text-ink-muted">
            This collection is empty right now. New stock is added every week —
            try another category in the meantime.
          </p>
          <ButtonLink href="/collections" variant="secondary" className="mt-2">
            Browse all categories
          </ButtonLink>
        </div>
      ) : (
        <CollectionResults action={`/collections/${collection.slug}`}>
          {items.map((p, i) => (
            // The data-* props are what the client sorter reads, so it never
            // needs the product objects themselves.
            <li
              key={p.id}
              data-price={p.price}
              data-discount={
                p.compareAtPrice && p.compareAtPrice > p.price
                  ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
                  : 0
              }
              data-instock={p.inStock ? 1 : 0}
            >
              {/* Only the first row is eager — the rest are below the fold. */}
              <ProductCard product={p} priority={i < 2} />
            </li>
          ))}
        </CollectionResults>
      )}

      <CollectionJsonLd
        name={collection.name}
        description={collection.description}
        slug={collection.slug}
        items={items.map((p) => ({ name: p.name, slug: p.slug, price: p.price }))}
      />
    </Container>
  );
}

/**
 * `CollectionPage` + an `ItemList` of what is on it. Google uses the list to
 * understand that this is a category rather than a single product, and to pick
 * up the members without re-crawling each one first.
 */
function CollectionJsonLd({
  name,
  description,
  slug,
  items,
}: {
  name: string;
  description: string;
  slug: string;
  items: { name: string; slug: string; price: number }[];
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${site.url}/collections/${slug}`,
    isPartOf: { "@type": "WebSite", name: site.legalName, url: site.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: `${site.url}/products/${p.slug}`,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      // Static, author-controlled object — no user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
