import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types/catalog";

/**
 * Scroll-snap rail on phones, grid on desktop — the same markup either way.
 *
 * The half-visible next card on mobile is deliberate: a partially clipped card
 * is the clearest possible signal that the row scrolls, and it beats any
 * arrow affordance on a touch screen.
 */
export function ProductRail({
  title,
  subtitle,
  href,
  products,
  priority = false,
  id,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: Product[];
  /** Only true for the first rail above the fold. */
  priority?: boolean;
  id: string;
}) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={id} className="py-8 sm:py-12">
      <Container>
        <SectionHeading id={id} title={title} subtitle={subtitle} href={href} />

        <ul className="rail rail-bleed gap-3 pb-1 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 sm:overflow-visible lg:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id} className="w-[45vw] max-w-[220px] sm:w-auto sm:max-w-none">
              <ProductCard
                product={p}
                priority={priority && i < 2}
                sizes="(min-width:1024px) 22vw, (min-width:640px) 30vw, 45vw"
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
