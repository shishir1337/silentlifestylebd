"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Taka } from "@/components/ui/price";
import { Card, Pill, EmptyState, TableScroll } from "./admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { SearchIcon } from "@/components/ui/icons";
import { setProductActive } from "@/lib/admin/catalog-actions";
import type { AdminProductRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * The product table.
 *
 * A real table from `md` up and a card list below it. The table is what makes
 * this readable at speed: prices and stock in aligned columns can be compared
 * down the page at a glance, which is the entire reason to look at a product
 * list rather than a product. On a phone those columns would need horizontal
 * scrolling to read one row, so the same data becomes a stack instead.
 *
 * Publish and hide live here rather than inside the editor. Taking something
 * off the shop because it has run out is the most frequent thing the client
 * will do, and it should not cost a page load, a form and a save.
 */
export function ProductList({
  products,
  query,
}: {
  products: AdminProductRow[];
  query: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  function toggle(row: AdminProductRow) {
    setBusyId(row.id);
    setFailure(null);
    startTransition(async () => {
      const result = await setProductActive(row.id, !row.isActive);
      if (!result.ok) setFailure(result.message);
      // The list is rendered from the database; refresh rather than patching
      // local state, so what is on screen is what was actually saved.
      else router.refresh();
      setBusyId(null);
    });
  }

  const busy = (id: string) => pending && busyId === id;

  return (
    <div>
      <form action="/admin/products" className="mb-4 max-w-sm">
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by name or code…"
            className={cn(inputClass(), "bg-canvas pl-9")}
          />
        </div>
      </form>

      {failure ? (
        <p
          role="alert"
          className="mb-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[13px] text-sale"
        >
          {failure}
        </p>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title={query ? `Nothing matches “${query}”` : "No products yet"}
          body={
            query
              ? "Try part of the name or the product code."
              : "Add your first product and it appears on the shop straight away."
          }
          action={
            query ? (
              <ButtonLink href="/admin/products" variant="secondary" size="sm" className="mt-1">
                Clear search
              </ButtonLink>
            ) : (
              <ButtonLink href="/admin/products/new" size="sm" className="mt-1">
                Add product
              </ButtonLink>
            )
          }
        />
      ) : (
        <>
          {/* ------------------------------------------------- table (md+) */}
          <Card className="hidden md:block">
            <TableScroll>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Stock
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className={cn(
                        "transition-colors duration-[var(--dur-base)] hover:bg-subtle",
                        !p.isActive && "bg-subtle/40",
                      )}
                    >
                      <td className="px-4 py-2.5">
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

                      <td className="px-3 py-2.5 text-[13px] text-ink-soft">
                        {p.categoryName}
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <Taka amount={p.price} className="text-[13px] font-semibold" />
                        {p.compareAtPrice ? (
                          <s className="mt-0.5 block text-[11.5px] text-ink-muted">
                            <Taka amount={p.compareAtPrice} />
                          </s>
                        ) : null}
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            "tabular text-[13px] font-medium",
                            p.totalStock === 0 && "text-sale",
                          )}
                        >
                          {p.totalStock}
                        </span>
                        {p.soldOutSizes.length > 0 && p.totalStock > 0 ? (
                          <span className="mt-0.5 block text-[11px] text-ink-muted">
                            no {p.soldOutSizes.join(", ")}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.isActive ? (
                            <Pill tone="on">Live</Pill>
                          ) : (
                            <Pill tone="off">Hidden</Pill>
                          )}
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
                            onClick={() => toggle(p)}
                            disabled={busy(p.id)}
                            className="inline-flex h-8 w-[68px] items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:opacity-50"
                          >
                            {busy(p.id) ? "…" : p.isActive ? "Hide" : "Publish"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>

          {/* ------------------------------------------------ cards (< md) */}
          <ul className="space-y-2 md:hidden">
            {products.map((p) => (
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

                <div className="mt-3 flex gap-2 border-t border-line pt-2.5">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    disabled={busy(p.id)}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-[13px] font-medium disabled:opacity-50"
                  >
                    {busy(p.id) ? "Saving…" : p.isActive ? "Hide" : "Publish"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
