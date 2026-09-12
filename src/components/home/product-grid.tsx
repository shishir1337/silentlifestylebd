import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types/catalog";

/**
 * Two columns on phones. Not one — a single-column feed halves the number of
 * products a shopper sees per scroll and measurably lowers the odds they find
 * something. Not three — the cards get too small to judge a garment.
 */
export function ProductGrid({
  title,
  subtitle,
  href,
  products,
  id,
  ctaLabel = "View all products",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: Product[];
  id: string;
  ctaLabel?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={id} className="py-8 sm:py-12">
      <Container>
        <SectionHeading id={id} title={title} subtitle={subtitle} href={href} />

        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-9 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>

        {href ? (
          <div className="mt-8 flex justify-center">
            <ButtonLink href={href} variant="secondary" size="md" className="min-w-[200px]">
              {ctaLabel}
            </ButtonLink>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
