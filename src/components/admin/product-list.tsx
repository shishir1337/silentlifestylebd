"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Taka } from "@/components/ui/price";
import { Pill, EmptyState } from "./admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { SearchIcon } from "@/components/ui/icons";
import { setProductActive } from "@/lib/admin/catalog-actions";
import type { AdminProductRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * The product table.
 *
 * Publish and hide happen here rather than inside the editor: taking something
 * off the shop because it has run out is the most frequent thing the client
 * will do, and it should not cost a page load, a form and a save.
 *
 * Stock is shown per product with the sold-out sizes named. "12 in stock" on a
 * shirt with no mediums left is technically true and operationally useless.
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
      // The list is server-rendered from the database; refresh rather than
      // patching local state, so what is on screen is what was actually saved.
      else router.refresh();
      setBusyId(null);
    });
  }

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
            className={cn(inputClass(), "pl-9")}
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
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border bg-canvas p-3 sm:flex-nowrap",
                p.isActive ? "border-line" : "border-dashed border-line-strong",
              )}
            >
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
                  className="line-clamp-1 text-[14px] font-medium hover:text-brand"
                >
                  {p.name}
                </Link>
                <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                  {p.sku} · {p.categoryName}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p.isActive ? (
                    <Pill tone="on">On the shop</Pill>
                  ) : (
                    <Pill tone="off">Hidden</Pill>
                  )}
                  {p.totalStock === 0 ? (
                    <Pill tone="warn">Out of stock</Pill>
                  ) : p.soldOutSizes.length > 0 ? (
                    <Pill tone="warn">No {p.soldOutSizes.join(", ")}</Pill>
                  ) : null}
                  {p.badge ? <Pill>{p.badge.toLowerCase()}</Pill> : null}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <Taka amount={p.price} className="text-[14px] font-semibold" />
                {p.compareAtPrice ? (
                  <s className="mt-0.5 block text-[12px] text-ink-muted">
                    <Taka amount={p.compareAtPrice} />
                  </s>
                ) : null}
                <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                  {p.totalStock} in stock
                </p>
              </div>

              <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink sm:flex-none"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  disabled={pending && busyId === p.id}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:opacity-50 sm:flex-none"
                >
                  {pending && busyId === p.id
                    ? "Saving…"
                    : p.isActive
                      ? "Hide"
                      : "Publish"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
