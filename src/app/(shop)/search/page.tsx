import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { SearchIcon } from "@/components/ui/icons";
import { POPULAR_SEARCHES, searchProducts } from "@/lib/search";
import { getCategories, getCategoryCounts } from "@/lib/catalog";
import { fillProps } from "@/lib/image";
import type { Category } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Silent Lifestyle BD catalogue.",
  // Result pages are thin and infinitely variable; there is nothing here that
  // should compete with the collection pages in an index.
  robots: { index: false, follow: true },
};

/**
 * Search results.
 *
 * Genuinely dynamic — the output depends entirely on `?q=`, so unlike the
 * collection routes there is nothing to prerender and no reason to pretend
 * otherwise. It reads searchParams on the server and renders in one pass.
 */
export default async function SearchPage(props: PageProps<"/search">) {
  const params = await props.searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;

  const [{ query, tooShort, products, categories: matched }, categories, counts] =
    await Promise.all([searchProducts(raw), getCategories(), getCategoryCounts()]);

  return (
    <Container>
      <div className="py-6">
        <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
        </h1>

        {/* Its own field, pre-filled: refining a search should not mean
            scrolling back up to the header on a phone. */}
        <form action="/search" method="get" role="search" className="mt-4 max-w-xl">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-muted" />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Search for panjabi, shirts, watches…"
              /* 16px min: anything smaller makes iOS Safari zoom on focus. */
              className="h-12 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface pr-3 pl-11 text-[16px] placeholder:text-ink-muted focus:border-brand"
            />
          </div>
        </form>

        {!tooShort ? (
          <p className="tabular mt-3 text-[13px] text-ink-muted" aria-live="polite">
            {products.length} {products.length === 1 ? "product" : "products"} found
          </p>
        ) : null}
      </div>

      {/* Category shortcuts when the query names one — usually faster than
          scrolling the results. */}
      {matched.length > 0 ? (
        <section aria-labelledby="matched-cats" className="pb-5">
          <h2
            id="matched-cats"
            className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase"
          >
            Matching categories
          </h2>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {matched.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                >
                  <span className="relative size-6 overflow-hidden rounded-full bg-subtle">
                    {c.image ? (
                      <Image
                        {...fillProps(c.image)}
                        alt=""
                        sizes="24px"
                        quality={60}
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  {c.name}
                  <span className="tabular text-[11px] text-ink-muted">
                    {counts[c.slug] ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tooShort ? (
        <EmptyPrompt
          title="What are you looking for?"
          body="Type at least two letters, or start from one of these."
          categories={categories}
        />
      ) : products.length === 0 ? (
        <EmptyPrompt
          title={`No products match “${query}”`}
          body="Check the spelling, try a shorter word, or browse a category instead."
          categories={categories}
        />
      ) : (
        <>
          <h2 className="sr-only">Search results</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-7 pb-8 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-9 lg:grid-cols-4">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 2} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}

/**
 * Shared no-results / no-query state. Both cases need the same thing: a way
 * out that does not involve typing again.
 *
 * Categories arrive as a prop rather than being read here: the page has
 * already awaited them for the chips above, and fetching again would be a
 * second read of the same cached list.
 */
function EmptyPrompt({
  title,
  body,
  categories,
}: {
  title: string;
  body: string;
  categories: Category[];
}) {
  return (
    <div className="pb-10">
      <div className="rounded-[var(--radius-md)] border border-line bg-subtle px-5 py-8 text-center">
        <p className="text-[17px] font-medium">{title}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-ink-muted">{body}</p>

        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {POPULAR_SEARCHES.map((term) => (
            <li key={term}>
              <Link
                href={`/search?q=${encodeURIComponent(term)}`}
                className="inline-flex h-10 items-center rounded-full border border-line-strong bg-canvas px-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
              >
                {term}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <section aria-labelledby="browse" className="mt-8">
        <h2 id="browse" className="text-[15px] font-semibold">
          Or browse a category
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/collections/${c.slug}`}
                className="group block rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-subtle">
                  {c.image ? (
                    <Image
                      {...fillProps(c.image)}
                      alt=""
                      sizes="(min-width:1024px) 15vw, (min-width:640px) 22vw, 45vw"
                      quality={60}
                      loading="lazy"
                      className="object-cover transition-transform duration-[var(--dur-slow)] [transition-timing-function:var(--ease-out-soft)] group-hover:scale-[1.07]"
                    />
                  ) : null}
                </div>
                <p className="mt-2 text-[13px] leading-tight font-medium">{c.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
