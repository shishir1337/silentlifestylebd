"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card, EmptyState, Pill, TableScroll } from "./admin-ui";
import { useToast } from "./toast";
import { deleteSizeChart, saveSizeChart } from "@/lib/admin/content-actions";
import type { AdminSizeChart } from "@/lib/admin/content-reads";
import { cn } from "@/lib/cn";

/**
 * Size charts, edited as the grid they are.
 *
 * The cheapest return-prevention the shop has, which is why it is worth being
 * editable: a chart that does not match the stock causes exactly the returns it
 * exists to avoid.
 *
 * Cells stay plain text on purpose. A column holds "M" on one chart and 27.5 on
 * another, and typing the number into a numeric input would lose the ½ and the
 * inch marks the client actually writes. The storefront renders them as-is.
 */
export function SizeChartManager({ charts }: { charts: AdminSizeChart[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminSizeChart | "new" | null>(null);
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function remove(chart: AdminSizeChart) {
    startTransition(async () => {
      const result = await deleteSizeChart(chart.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`“${chart.title}” removed.`);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <ChartForm
        chart={editing === "new" ? null : editing}
        onDone={() => {
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setEditing("new")}>
          Add chart
        </Button>
      </div>

      {charts.length === 0 ? (
        <EmptyState
          title="No size charts"
          body="Charts appear on the size guide page and are linked from every product that has sizes."
        />
      ) : (
        <ul className="space-y-3">
          {charts.map((c) => (
            <li key={c.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold">{c.title}</p>
                      {!c.isActive ? <Pill tone="off">Hidden</Pill> : null}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      {c.rows.length} {c.rows.length === 1 ? "row" : "rows"} ·{" "}
                      {c.columns.length} columns
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium hover:border-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      disabled={pending}
                      className="inline-flex h-9 items-center rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-ink-muted hover:text-sale disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <TableScroll>
                  <table className="w-full border-collapse text-left text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-[11px] font-semibold text-ink-muted uppercase">
                        {c.columns.map((col) => (
                          <th key={col} scope="col" className="px-3 py-2 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {c.rows.map((r) => (
                        <tr key={r.id}>
                          {r.cells.map((cell, i) => (
                            <td key={i} className="tabular px-3 py-1.5">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChartForm({
  chart,
  onDone,
  onCancel,
}: {
  chart: AdminSizeChart | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [title, setTitle] = useState(chart?.title ?? "");
  const [note, setNote] = useState(chart?.note ?? "");
  const [isActive, setIsActive] = useState(chart?.isActive ?? true);
  const [columns, setColumns] = useState<string[]>(
    chart?.columns.length ? chart.columns : ["Size", "Chest", "Length"],
  );
  const [rows, setRows] = useState<string[][]>(
    chart?.rows.length ? chart.rows.map((r) => [...r.cells]) : [["", "", ""]],
  );

  const setCell = (r: number, c: number, value: string) =>
    setRows((prev) => prev.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? value : x)) : row)));

  function addColumn() {
    setColumns((prev) => [...prev, ""]);
    setRows((prev) => prev.map((r) => [...r, ""]));
  }

  function removeColumn(index: number) {
    if (columns.length <= 2) return;
    setColumns((prev) => prev.filter((_, i) => i !== index));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== index)));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await saveSizeChart({
        id: chart?.id,
        title,
        note,
        columns,
        rows,
        isActive,
      });
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      toast.success(chart ? "Chart saved." : "Chart added.");
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl">
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">
          {chart ? `Edit ${chart.title}` : "New size chart"}
        </h2>

        {failure ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
          >
            {failure}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <Field label="Title" id="sc-title" required>
            <input
              id="sc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shirts & polos"
              className={inputClass()}
            />
          </Field>

          <Field
            label="Note"
            id="sc-note"
            hint="Shown above the table, e.g. how the garment was measured."
          >
            <input
              id="sc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Measured on the garment laid flat, in inches."
              className={inputClass()}
            />
          </Field>
        </div>

        <div className="mt-5">
          <p className="text-[13px] font-medium">The table</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            Anything can go in a cell — “M”, 38, 27½. It appears exactly as you
            type it.
          </p>

          <TableScroll>
            <table className="mt-3 w-full border-collapse">
              <thead>
                <tr>
                  {columns.map((col, ci) => (
                    <th key={ci} scope="col" className="p-1 align-bottom">
                      <label htmlFor={`col-${ci}`} className="sr-only">
                        Column {ci + 1} heading
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          id={`col-${ci}`}
                          value={col}
                          onChange={(e) =>
                            setColumns((prev) => prev.map((x, i) => (i === ci ? e.target.value : x)))
                          }
                          placeholder="Heading"
                          className={cn(inputClass(), "h-9 px-2 text-[12.5px] font-semibold")}
                        />
                        <button
                          type="button"
                          onClick={() => removeColumn(ci)}
                          disabled={columns.length <= 2}
                          aria-label={`Remove column ${col || ci + 1}`}
                          className="shrink-0 text-[12px] text-ink-muted hover:text-sale disabled:opacity-25"
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {columns.map((_, ci) => (
                      <td key={ci} className="p-1">
                        <label htmlFor={`cell-${ri}-${ci}`} className="sr-only">
                          Row {ri + 1}, {columns[ci] || `column ${ci + 1}`}
                        </label>
                        <input
                          id={`cell-${ri}-${ci}`}
                          value={row[ci] ?? ""}
                          onChange={(e) => setCell(ri, ci, e.target.value)}
                          className={cn(inputClass(), "tabular h-9 px-2 text-[12.5px]")}
                        />
                      </td>
                    ))}
                    <td className="p-1 align-middle">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== ri))}
                        disabled={rows.length <= 1}
                        aria-label={`Remove row ${ri + 1}`}
                        className="text-[12px] text-ink-muted hover:text-sale disabled:opacity-25"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, columns.map(() => "")])}
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium hover:border-ink"
            >
              Add row
            </button>
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium hover:border-ink"
            >
              Add column
            </button>
          </div>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-[14px]">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
          />
          <span>Show on the size guide page</span>
        </label>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : chart ? "Save chart" : "Add chart"}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] px-3 text-[14px] font-medium text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </Card>
    </form>
  );
}
