import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon } from "@/components/ui/icons";
import mensCollection from "@/assets/catalog/promo-mens-formal.jpg";
import womensCollection from "@/assets/catalog/pakistani-stitched.jpg";
import type { PromoTile } from "@/types/catalog";

const tiles: PromoTile[] = [
  {
    title: "Men Collection",
    subtitle: "Panjabi, formal shirts, pants, shoes, belts and watches.",
    href: "/collections/men",
    image: mensCollection,
    cta: "Shop men",
  },
  {
    title: "Women Collection",
    subtitle: "Pakistani stitched and unstitched sets, purses and bracelets.",
    href: "/collections/women",
    image: womensCollection,
    cta: "Shop women",
  },
];

/**
 * Two editorial tiles splitting the store's two distinct audiences. Text sits
 * on a bottom gradient rather than free-floating over the photo, so the copy
 * keeps its contrast ratio no matter how the image crops at a given width.
 */
export function PromoTiles() {
  return (
    <section aria-label="Shop by collection" className="py-8 sm:py-12">
      <Container>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {tiles.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="group relative block aspect-4/3 overflow-hidden rounded-[var(--radius-lg)] bg-muted sm:aspect-16/11 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                <Image
                  src={t.image}
                  alt=""
                  fill
                  sizes="(min-width:640px) 46vw, 92vw"
                  quality={60}
                  loading="lazy"
                  placeholder="blur"
                  className="object-cover transition-transform duration-[600ms] [transition-timing-function:var(--ease-out-soft)] group-hover:scale-[1.06]"
                />

                <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-white sm:text-xl">
                    {t.title}
                  </h3>
                  <p className="mt-1 max-w-[34ch] text-[13px] leading-snug text-white/85">
                    {t.subtitle}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-white">
                    {t.cta}
                    <ArrowRightIcon className="size-4 transition-transform duration-200 [transition-timing-function:var(--ease-out-soft)] group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
