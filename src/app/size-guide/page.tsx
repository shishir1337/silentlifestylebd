import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { sizeCharts } from "@/data/size-guides";
import { delivery } from "@/data/site";

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
export default function SizeGuidePage() {
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
          <p className="text-[13px] text-ink-muted">{chart.note}</p>

          {/*
            Tables are the one thing on this site allowed to scroll sideways —
            a size chart squeezed into 360px is unreadable, and shrinking the
            text to fit is worse than letting the table scroll in its own box.
          */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[420px] border-collapse text-[13px]">
              <caption className="sr-only">
                {chart.title} — measurements in inches
              </caption>
              <thead>
                <tr className="border-b border-line-strong text-left">
                  {chart.columns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="py-2.5 pr-4 font-semibold whitespace-nowrap text-ink"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((row) => (
                  <tr key={String(row[0])} className="border-b border-line last:border-0">
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={
                          i === 0
                            ? "tabular py-2.5 pr-4 font-semibold whitespace-nowrap text-ink"
                            : "tabular py-2.5 pr-4 whitespace-nowrap"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}

      <Section id="still-unsure" title="Still not sure?">
        <p>
          Call us before you order and we will check the exact measurements of the
          piece for you. If it still arrives wrong, the{" "}
          {delivery.returnWindowDays}-day exchange covers it.
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
