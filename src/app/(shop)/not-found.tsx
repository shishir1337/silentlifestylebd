import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { getCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * The shop's 404.
 *
 * A dead end on a shop is a lost sale, so this is a way back in rather than an
 * apology: the categories are read from the database, which means a customer
 * who followed a stale link to a renamed collection lands on the current ones
 * instead of a list that went out of date with the link.
 *
 * `follow: true` deliberately. The page should not be indexed, but the links
 * off it are the ones we want a crawler that got here to take.
 */
export default async function ShopNotFound() {
  const categories = await getCategories();

  return (
    <Container>
      <div className="py-14 sm:py-20">
        <p className="text-[12px] font-semibold tracking-wider text-ink-muted uppercase">
          404
        </p>
        <h1 className="font-display mt-2 text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">
          We can&apos;t find that page
        </h1>
        <p className="mt-2.5 max-w-prose text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">
          The link may be old, or the product may have sold out and been taken
          down. Everything we have is still a tap away.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <ButtonLink href="/collections" className="sm:w-auto sm:px-7">
            Shop all collections
          </ButtonLink>
          <ButtonLink href="/track" variant="secondary" className="sm:w-auto sm:px-7">
            Track an order
          </ButtonLink>
        </div>

        <h2 className="mt-10 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
          Shop by category
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/collections/${c.slug}`}
                className="inline-flex h-10 items-center rounded-full border border-line-strong px-3.5 text-[13.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
