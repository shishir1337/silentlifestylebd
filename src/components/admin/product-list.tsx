"use client";

import { Fragment, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Taka } from "@/components/ui/price";
import { Card, Pill, EmptyState, TableScroll } from "./admin-ui";
import { StockEditor } from "./stock-editor";
import { useToast } from "./toast";
import { ButtonLink } from "@/components/ui/button";
import { bulkSetProductActive, setProductActive } from "@/lib/admin/catalog-actions";
import type { AdminProductRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * The product table.
 *
 * A real table from `md` up and a card list below it. Aligned columns are the
 * entire reason to look at a list rather than a product: prices and stock can
 * be compared straight down the page. On a phone those columns would need
 * sideways scrolling to read one row, so the same data stacks instead.
 *
 * Three things happen here rather than in the editor, because all three are
 * what somebody actually came to do: publish, hide, and put a number against a
 * size.
 */
export function ProductList({
  rows,
  filtered,
}: {
  rows: AdminProductRow[];
  filtered: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleActive(row: AdminProductRow) {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await setProductActive(row.id, !row.isActive);
      setBusyId(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        row.isActive ? `${row.name} is hidden.` : `${row.name} is on the shop.`,
        () => {
          // Undo restores the previous state — the same audited write, not a
          // special case. Only offered while the toast is alive.
          startTransition(async () => {
            await setProductActive(row.id, row.isActive);
            router.refresh();
          });
        },
      );
      router.refresh();
    });
  }

  function bulk(isActive: boolean) {
    const ids = [...selected];
    startTransition(async () => {
      const result = await bulkSetProductActive(ids, isActive);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSelected(new Set());
      toast.success(
        `${ids.length} ${ids.length === 1 ? "product" : "products"} ${isActive ? "published" : "hidden"}.`,
      );
      router.refresh();
    });
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  if (rows.length === 0) {
    return (
      <EmptyState
        title={filtered ? "Nothing matches those filters" : "No products yet"}
        body={
          filtered
            ? "Try a different category, or clear the filters to see everything."
            : "Add your first product and it appears on the shop straight away."
        }
        action={
          filtered ? (
            <ButtonLink href="/admin/products" variant="secondary" size="sm" className="mt-1">
              Clear filters
            </ButtonLink>
          ) : (
            <ButtonLink href="/admin/products/new" size="sm" className="mt-1">
              Add product
            </ButtonLink>
          )
        }
      />
    );
  }

  return (
    <div>
      {selected.size > 0 ? (
        <div className="sticky top-14 z-[var(--z-sticky)] mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-ink bg-ink px-3 py-2.5 text-white shadow-[var(--shadow-pop)] lg:top-0">
          <p className="tabular mr-1 text-[13px] font-medium">{selected.size} selected</p>
          <button
            type="button"
            onClick={() => bulk(true)}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-white/12 px-2.5 text-[12.5px] font-medium hover:bg-white/20 disabled:opacity-50"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => bulk(false)}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-white/12 px-2.5 text-[12.5px] font-medium hover:bg-white/20 disabled:opacity-50"
          >
            Hide
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2.5 text-[12.5px] font-medium text-white/70 hover:text-white"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* ------------------------------------------------------ table (md+) */}
      <Card className="hidden md:block">
        <TableScroll>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                <th scope="col" className="w-10 py-2.5 pl-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
                    }
                    aria-label="Select all products on this page"
                    className="size-4 accent-[var(--color-ink)]"
                  />
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Product</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Price</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Stock</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <Fragment key={p.id}>
                  <tr
                    className={cn(
                      "transition-colors duration-[var(--dur-base)] hover:bg-subtle",
                      (selected.has(p.id) || editingStock === p.id) && "bg-subtle",
                      !p.isActive && "bg-subtle/40",
                    )}
                  >
                    <td className="py-2.5 pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="size-4 accent-[var(--color-ink)]"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-subtle">
                          {p.imageUrl ? (
                            <Image
                              src={p.imageUrl}
                              alt=""
                              fill
                              sizes="40px"
                              quality={60}
                              className={cn("object-cover", !p.isActive && "opacity-50")}
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="line-clamp-1 text-[13.5px] font-medium hover:text-brand"
                          >
                            {p.name}
                          </Link>
                          <span className="tabular mt-0.5 block text-[11.5px] text-ink-muted">
                            {p.sku}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-[13px] text-ink-soft">{p.categoryName}</td>

                    <td className="px-3 py-2.5 text-right">
                      <Taka amount={p.price} className="text-[13px] font-semibold" />
                      {p.compareAtPrice ? (
                        <s className="mt-0.5 block text-[11.5px] text-ink-muted">
                          <Taka amount={p.compareAtPrice} />
                        </s>
                      ) : null}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      {/* The number is the control. Stock is what people come
                          here to change, so it opens where it is read. */}
                      <button
                        type="button"
                        onClick={() => setEditingStock(editingStock === p.id ? null : p.id)}
                        aria-expanded={editingStock === p.id}
                        className={cn(
                          "tabular rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[13px] font-medium",
                          "transition-colors duration-[var(--dur-base)] hover:bg-muted",
                          p.totalStock === 0 ? "text-sale" : "text-ink",
                        )}
                      >
                        {p.totalStock}
                      </button>
                      {p.soldOutSizes.length > 0 && p.totalStock > 0 ? (
                        <span className="mt-0.5 block text-[11px] text-ink-muted">
                          no {p.soldOutSizes.join(", ")}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.isActive ? <Pill tone="on">Live</Pill> : <Pill tone="off">Hidden</Pill>}
                        {p.totalStock === 0 ? <Pill tone="warn">Out</Pill> : null}
                        {p.badge ? <Pill>{p.badge.toLowerCase()}</Pill> : null}
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleActive(p)}
                          disabled={pending && busyId === p.id}
                          className="inline-flex h-8 w-[68px] items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:opacity-50"
                        >
                          {pending && busyId === p.id ? "…" : p.isActive ? "Hide" : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {editingStock === p.id ? (
                    <tr className="bg-subtle">
                      <td colSpan={7} className="px-4 py-2.5">
                        <StockEditor
                          productId={p.id}
                          productName={p.name}
                          variants={p.variants}
                          onClose={() => setEditingStock(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>

      {/* ----------------------------------------------------- cards (<md) */}
      <ul className="space-y-2 md:hidden">
        {rows.map((p) => (
          <li
            key={p.id}
            className={cn(
              "rounded-[var(--radius-md)] border bg-canvas p-3 shadow-[var(--shadow-card)]",
              p.isActive ? "border-line" : "border-dashed border-line-strong",
            )}
          >
            <div className="flex gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-subtle">
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    quality={60}
                    className={cn("object-cover", !p.isActive && "opacity-50")}
                  />
                ) : null}
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="line-clamp-2 text-[14px] font-medium"
                >
                  {p.name}
                </Link>
                <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                  {p.sku} · {p.categoryName}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p.isActive ? <Pill tone="on">Live</Pill> : <Pill tone="off">Hidden</Pill>}
                  {p.totalStock === 0 ? (
                    <Pill tone="warn">Out of stock</Pill>
                  ) : p.soldOutSizes.length > 0 ? (
                    <Pill tone="warn">No {p.soldOutSizes.join(", ")}</Pill>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <Taka amount={p.price} className="text-[14px] font-semibold" />
                <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                  {p.totalStock} left
                </p>
              </div>
            </div>

            {editingStock === p.id ? (
              <div className="mt-3">
                <StockEditor
                  productId={p.id}
                  productName={p.name}
                  variants={p.variants}
                  onClose={() => setEditingStock(null)}
                />
              </div>
            ) : (
              <div className="mt-3 flex gap-2 border-t border-line pt-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStock(p.id)}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium"
                >
                  Stock
                </button>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  disabled={pending && busyId === p.id}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium disabled:opacity-50"
                >
                  {pending && busyId === p.id ? "…" : p.isActive ? "Hide" : "Publish"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
