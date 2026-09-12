import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCategories, getCategoryCounts } from "@/lib/catalog";
import { fillProps } from "@/lib/image";

/**
 * The shortest path from landing to intent, and on mobile the most-tapped
 * element on the page — so it sits directly under the hero.
 *
 * Horizontal scroll-snap rail on phones, plain grid from `sm` up. Implemented
 * with CSS scroll-snap rather than a carousel library: no JS, native momentum,
 * and it stays usable with a keyboard and a trackpad.
 *
 * Counts are fetched once for the whole rail rather than per tile — twelve
 * sequential awaits inside the map would serialise twelve identical reads.
 */
export async function CategoryRail() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
  ]);

  return (
    <section aria-labelledby="shop-categories" className="py-8 sm:py-12">
      <Container>
        <SectionHeading
          id="shop-categories"
          title="Shop by category"
          subtitle={`${categories.length} categories, one delivery charge.`}
          href="/collections"
        />

        <ul className="rail rail-bleed gap-3 pb-1 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible lg:grid-cols-6">
          {categories.map((c, i) => (
            <li key={c.slug} className="w-[104px] sm:w-auto">
              <Link
                href={`/collections/${c.slug}`}
                className="group block rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                {/* A category with no image keeps its box: the tile still
                    reserves the same square, so the rail cannot reflow if the
                    client adds or removes artwork in the admin. */}
                <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-subtle">
                  {c.image ? (
                    <Image
                      {...fillProps(c.image)}
                      alt=""
                      sizes="(min-width:1024px) 15vw, (min-width:640px) 22vw, 104px"
                      quality={60}
                      /* First four are above the fold on most phones. */
                      loading={i < 4 ? "eager" : "lazy"}
                      className="object-cover transition-transform duration-[var(--dur-slow)] [transition-timing-function:var(--ease-out-soft)] group-hover:scale-[1.07]"
                    />
                  ) : null}
                </div>

                <p className="mt-2 text-center text-[12px] leading-tight font-medium sm:text-[13px]">
                  {c.name}
                </p>
                <p className="tabular mt-0.5 text-center text-[11px] text-ink-muted">
                  {counts[c.slug] ?? 0} items
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
