import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ChevronRightIcon } from "@/components/ui/icons";
import {
  getCategories,
  getCategoryCounts,
  getCuratedCollections,
} from "@/lib/catalog";
import { fillProps } from "@/lib/image";

export const metadata: Metadata = {
  title: "Shop all collections",
  description:
    "Browse every category — panjabi, formal shirts, t-shirts, polos, pants, shoes, watches, belts, wallets, purses, bracelets and Pakistani ladies collections.",
  alternates: { canonical: "/collections" },
};

/**
 * Collections index — the destination behind the "Shop" tab.
 *
 * Two groups, because they answer different questions: the curated sets are
 * for a shopper who knows the occasion ("what's new", "what's on offer"), the
 * category grid is for one who knows the garment.
 */
export default async function CollectionsPage() {
  const [curated, categories, counts] = await Promise.all([
    getCuratedCollections(),
    getCategories(),
    getCategoryCounts(),
  ]);

  return (
    <Container>
      <header className="py-6">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[34px]">
          Shop by collection
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Everything we stock, grouped two ways.
        </p>
      </header>

      <section aria-labelledby="curated" className="pb-8">
        <h2
          id="curated"
          className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase"
        >
          Featured
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {curated.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/collections/${c.slug}`}
                className="group flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3.5 transition-colors duration-[var(--dur-base)] hover:border-ink"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">{c.name}</span>
                  <span className="mt-0.5 block line-clamp-1 text-[12px] text-ink-muted">
                    {c.description}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="tabular text-[12px] text-ink-muted">{c.count}</span>
                  <ChevronRightIcon className="size-4 text-ink-muted transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-ink" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="all-categories" className="pb-10">
        <h2
          id="all-categories"
          className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase"
        >
          All categories
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((c, i) => (
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
                      loading={i < 4 ? "eager" : "lazy"}
                      className="object-cover transition-transform duration-[var(--dur-slow)] [transition-timing-function:var(--ease-out-soft)] group-hover:scale-[1.07]"
                    />
                  ) : null}
                </div>
                <p className="mt-2 text-[13px] leading-tight font-medium">{c.name}</p>
                <p className="tabular mt-0.5 text-[11px] text-ink-muted">
                  {counts[c.slug] ?? 0} items
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
