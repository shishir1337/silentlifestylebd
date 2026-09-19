import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { SizeChartTable } from "@/components/product/size-chart-table";
import { getSizeCharts } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Size guide",
  description:
    "Size charts for shirts, t-shirts, polos, panjabi, pants, shoes and Pakistani three-piece sets. All measurements in inches.",
  alternates: { canonical: "/size-guide" },
};

/**
 * Size guide.
 *
 * The cheapest return-prevention on the site, which is why the product page
 * links straight here from beside the size selector. Charts are garment-
 * measured rather than body-measured, and the page says so up front — the two
 * conventions differ by several inches and the confusion is what causes the
 * wrong size to be ordered in the first place.
 */
export default async function SizeGuidePage() {
  const [sizeCharts, { delivery }] = await Promise.all([
    getSizeCharts(),
    getSiteSettings(),
  ]);

  return (
    <Container>
      <PageHeader
        breadcrumb="Size guide"
        title="Size guide"
        lead="All measurements are in inches, taken on the garment laid flat — not body measurements."
      />

      <div className="rounded-[var(--radius-md)] border border-line bg-subtle p-4">
        <h2 className="text-[15px] font-semibold">The easiest way to get it right</h2>
        <div className="mt-2.5 max-w-prose text-[14px] leading-relaxed text-ink-soft">
          <Bullets
            items={[
              "Take a shirt or pant you already own and like the fit of.",
              "Lay it flat and measure across the chest or waist, then double it.",
              "Match that number to the chart below.",
              "Between two sizes? Take the larger one — it is easier to take in than let out.",
            ]}
          />
        </div>
      </div>

      {sizeCharts.map((chart) => (
        <Section key={chart.id} id={chart.id} title={chart.title}>
          {/*
            The same table a product page shows in its size-chart tab. One
            component, so the two can never disagree about which column is the
            heading — and the heading is the size.
          */}
          <SizeChartTable chart={chart} />
        </Section>
      ))}

      <Section id="still-unsure" title="Still not sure?">
        <p>
          Call us before you order and we will check the exact measurements of
          the piece for you. It is worth the call — measuring first is how you
          get the right size, and it costs nothing.
        </p>
      </Section>

      <div className="flex flex-col gap-2.5 border-t border-line py-6 sm:flex-row">
        <ButtonLink href="/collections" className="sm:flex-1">
          Back to shopping
        </ButtonLink>
        <ButtonLink href="/returns" variant="secondary" className="sm:flex-1">
          Read the return policy
        </ButtonLink>
      </div>
    </Container>
  );
}
