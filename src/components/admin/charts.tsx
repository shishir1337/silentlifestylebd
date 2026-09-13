import { formatBDT } from "@/lib/currency";
import type { AnalyticsPoint, TopRow } from "@/lib/admin/analytics";
import { cn } from "@/lib/cn";

/**
 * Charts, drawn here rather than imported.
 *
 * Two shapes are needed — a column per day, and a ranked bar — and a charting
 * library is 40–120 KB to draw two shapes. It would also arrive with its own
 * ideas about colour, type and tooltips, which would then have to be argued
 * back into the rest of the panel.
 *
 * Both are server-rendered SVG with no client JavaScript at all, and both are
 * followed by the same numbers as a real table. A chart is a summary; the
 * table is the data, and it is what a screen reader reads, what copies into a
 * spreadsheet, and what is there when the shape is too small to judge.
 */

const H = 140;

export function ColumnChart({
  points,
  title,
}: {
  points: AnalyticsPoint[];
  title: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.placed));
  const step = points.length > 45 ? 10 : points.length > 20 ? 18 : 34;
  const width = Math.max(points.length * step, 320);
  /*
    Short ranges stretch to the card; long ones keep a readable column width
    and let the wrapper scroll. A fixed pixel width did neither — thirty days
    drew a chart two-thirds the width of its card and left the rest blank.
  */
  const scrolls = points.length > 45;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>

      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label={`${title}. The same figures are in the table below.`}
          viewBox={`0 0 ${width} ${H}`}
          height={H}
          preserveAspectRatio="none"
          style={scrolls ? { minWidth: width } : undefined}
          className="block w-full"
        >
          {points.map((p, i) => {
            const placedH = Math.round((p.placed / max) * (H - 18));
            const collectedH = Math.round((p.collected / max) * (H - 18));
            const x = i * step;
            const w = Math.max(3, step - 4);
            return (
              <g key={p.bucket}>
                {/*
                  Two bars in one column, not stacked: what was placed, and the
                  part of it that was actually collected. Stacking would hide
                  the gap, and the gap is the point.
                */}
                <rect
                  x={x}
                  y={H - 18 - placedH}
                  width={w}
                  height={placedH}
                  rx={2}
                  className="fill-muted"
                />
                <rect
                  x={x}
                  y={H - 18 - collectedH}
                  width={w}
                  height={collectedH}
                  rx={2}
                  className="fill-brand"
                />
              </g>
            );
          })}
          <line x1={0} y1={H - 18} x2={width} y2={H - 18} className="stroke-line" strokeWidth={1} />
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11.5px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px] bg-brand" />
          Collected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px] bg-muted" />
          Placed
        </span>
        {points.length > 0 ? (
          <span className="ml-auto">
            {points[0].label} — {points[points.length - 1].label}
          </span>
        ) : null}
      </div>
    </figure>
  );
}

/** The numbers behind the columns. Collapsed, because it is a fallback. */
export function SeriesTable({ points }: { points: AnalyticsPoint[] }) {
  const withOrders = points.filter((p) => p.orders > 0);
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[12.5px] font-medium text-ink-soft">
        Show the figures ({withOrders.length}{" "}
        {withOrders.length === 1 ? "day" : "days"} with orders)
      </summary>
      {/*
        Scrolls both ways. Four columns of figures have a min-content width of
        their own, and a grid item defaults to `min-width: auto` — so without
        this the table quietly makes its card wider than the phone it is on.
      */}
      <div className="mt-2 max-h-64 overflow-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead className="sticky top-0 bg-canvas">
            <tr className="border-b border-line text-[11px] tracking-wide text-ink-muted uppercase">
              <th scope="col" className="py-1.5 pr-2 font-semibold">When</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Orders</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Placed</th>
              <th scope="col" className="py-1.5 text-right font-semibold">Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {withOrders.map((p) => (
              <tr key={p.bucket}>
                <td className="py-1.5 pr-2">{p.label}</td>
                <td className="tabular py-1.5 pr-2 text-right">{p.orders}</td>
                <td className="tabular py-1.5 pr-2 text-right">{formatBDT(p.placed)}</td>
                <td className="tabular py-1.5 text-right font-medium">
                  {formatBDT(p.collected)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * A ranked list with the bar behind the words.
 *
 * A bar chart of eight product names needs the names anyway, so the bar goes
 * behind the row rather than beside it — the reader gets the ranking from the
 * shape and the figure from the text, in one line each.
 */
export function RankedBars({
  rows,
  unitLabel = "sold",
  empty,
}: {
  rows: TopRow[];
  unitLabel?: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[13px] text-ink-muted">{empty}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ol className="space-y-1">
      {rows.map((row, i) => (
        <li key={row.name} className="relative overflow-hidden rounded-[var(--radius-xs)]">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 bg-brand-tint"
            style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
          />
          <div className="relative flex items-center gap-3 px-2.5 py-2">
            <span className="tabular w-4 shrink-0 text-[11px] text-ink-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[13px]">{row.name}</span>
            <span className="tabular shrink-0 text-[12px] text-ink-muted">
              {row.units} {unitLabel}
            </span>
            <span className={cn("tabular shrink-0 text-[13px] font-semibold")}>
              {formatBDT(row.value)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * A proportion, as a bar rather than a pie.
 *
 * Two or three shares, compared. A pie for two numbers is a circle somebody
 * has to read twice.
 */
export function SplitBar({
  parts,
}: {
  parts: { label: string; value: number; className: string }[];
}) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (total === 0) {
    return <p className="text-[13px] text-ink-muted">Nothing yet in this period.</p>;
  }

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (
          <div
            key={p.label}
            className={p.className}
            style={{ width: `${(p.value / total) * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
      <ul className="mt-2.5 space-y-1">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-[12.5px]">
            <span className={cn("inline-block size-2.5 shrink-0 rounded-[2px]", p.className)} />
            <span className="text-ink-soft">{p.label}</span>
            <span className="tabular ml-auto font-medium">
              {Math.round((p.value / total) * 100)}%
            </span>
            <span className="tabular w-16 text-right text-ink-muted">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
