import type { SizeChart } from "@/types/catalog";

/**
 * One size chart, rendered the same way wherever it appears.
 *
 * Extracted because there are now two places that show one: the reference page
 * at `/size-guide`, which lists them all, and the size-chart tab on a product
 * page, which shows the single chart that applies to what is being bought. A
 * second copy of this table would eventually disagree with the first about
 * which column is the heading, and the heading is the size.
 */
export function SizeChartTable({
  chart,
  showTitle = false,
}: {
  chart: SizeChart;
  /** The reference page has its own heading; the product tab does not. */
  showTitle?: boolean;
}) {
  return (
    <div>
      {showTitle ? (
        <h3 className="text-[15px] font-semibold">{chart.title}</h3>
      ) : null}

      <p className="text-[13px] leading-relaxed text-ink-muted">{chart.note}</p>

      {/*
        Tables are the one thing on this site allowed to scroll sideways — a
        size chart squeezed into 360px is unreadable, and shrinking the text to
        fit is worse than letting the table scroll in its own box.
      */}
      <div className="mt-3 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
                    key={chart.columns[i] ?? i}
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
    </div>
  );
}
