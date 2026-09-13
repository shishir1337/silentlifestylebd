"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card, Pill } from "./admin-ui";
import { AssetPicker } from "./asset-picker";
import { saveProduct, deleteProduct } from "@/lib/admin/catalog-actions";
import type { ProductInput, ProductBadgeValue } from "@/lib/admin/catalog-types";
import type { AdminProductDetail } from "@/lib/admin/catalog-reads";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

interface CategoryOption {
  id: string;
  name: string;
}

/**
 * The product editor.
 *
 * Written for somebody who runs a clothing shop, not somebody who writes
 * software. Every field says what it does to the shop, prices are in whole
 * taka with no currency parsing to get wrong, and the sections are ordered the
 * way a person thinks about a garment: what it is, what it costs, what sizes
 * are left, what it looks like.
 *
 * The one genuinely technical field — the web address — is filled in
 * automatically and tucked away, because changing it breaks links that
 * customers and Google already have.
 */
export function ProductForm({
  product,
  categories,
  assets,
}: {
  /** Null when creating. */
  product: AdminProductDetail | null;
  categories: CategoryOption[];
  assets: AssetRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [form, setForm] = useState(() => ({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    price: product ? String(product.price) : "",
    compareAtPrice: product?.compareAtPrice ? String(product.compareAtPrice) : "",
    description: product?.description ?? "",
    badge: (product?.badge ?? "") as ProductBadgeValue | "",
    freeDelivery: product?.freeDelivery ?? false,
    isActive: product?.isActive ?? true,
    details: product?.details.length ? product.details : [""],
    colors: product?.colors ?? [],
    variants: product?.variants.length
      ? product.variants.map((v) => ({ size: v.size, stock: String(v.stock) }))
      : [{ size: "", stock: "0" }],
    primaryAssetId: product?.primaryAssetId ?? null,
    hoverAssetId: product?.hoverAssetId ?? null,
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
  }));

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);

    const input: ProductInput = {
      id: product?.id,
      name: form.name,
      slug: form.slug,
      sku: form.sku,
      categoryId: form.categoryId,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      description: form.description,
      badge: form.badge || null,
      freeDelivery: form.freeDelivery,
      isActive: form.isActive,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      details: form.details,
      colors: form.colors,
      variants: form.variants.map((v) => ({ size: v.size, stock: Number(v.stock) || 0 })),
      primaryAssetId: form.primaryAssetId,
      hoverAssetId: form.hoverAssetId,
    };

    startTransition(async () => {
      const result = await saveProduct(input);
      if (!result.ok) {
        setFailure(result.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  function onDelete() {
    setFailure(null);
    startTransition(async () => {
      const result = await deleteProduct(product!.id);
      if (!result.ok) {
        setFailure(result.message);
        setConfirmingDelete(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  /* --- sizes ------------------------------------------------------------- */

  const setVariant = (i: number, patch: Partial<{ size: string; stock: string }>) =>
    set(
      "variants",
      form.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    );

  const addVariant = () => set("variants", [...form.variants, { size: "", stock: "0" }]);
  const removeVariant = (i: number) =>
    set("variants", form.variants.filter((_, idx) => idx !== i));

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-5">
      {failure ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[14px] leading-relaxed text-sale"
        >
          {failure}
        </p>
      ) : null}

      {/* ---------------------------------------------------------- basics */}
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">The product</h2>
        <div className="mt-4 space-y-4">
          <Field label="Name" id="p-name" required hint="What customers see, e.g. “Premium Cotton Panjabi — Off White”.">
            <input
              id="p-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass()}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product code" id="p-sku" required hint="Your own reference. Must be unique.">
              <input
                id="p-sku"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                className={cn(inputClass(), "uppercase")}
              />
            </Field>

            <Field label="Category" id="p-cat" required>
              <select
                id="p-cat"
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className={inputClass()}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Description"
            id="p-desc"
            hint="One or two sentences. What it is and what it is like to wear."
          >
            <textarea
              id="p-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={cn(inputClass(), "h-auto py-2.5")}
            />
          </Field>
        </div>
      </Card>

      {/* ----------------------------------------------------------- price */}
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Price</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Price (৳)" id="p-price" required hint="Whole taka, no decimals.">
            <input
              id="p-price"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className={cn(inputClass(), "tabular")}
            />
          </Field>

          <Field
            label="Old price (৳)"
            id="p-compare"
            hint="Only if it is genuinely reduced. Leave empty otherwise."
          >
            <input
              id="p-compare"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={form.compareAtPrice}
              onChange={(e) => set("compareAtPrice", e.target.value)}
              className={cn(inputClass(), "tabular")}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-start gap-2.5 text-[14px]">
          <input
            type="checkbox"
            checked={form.freeDelivery}
            onChange={(e) => set("freeDelivery", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
          />
          <span>
            Always free delivery
            <span className="mt-0.5 block text-[12px] text-ink-muted">
              Ignores the usual delivery charge for this item, whatever the order
              total is.
            </span>
          </span>
        </label>
      </Card>

      {/* ----------------------------------------------------------- sizes */}
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Sizes and stock</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          How many of each size you have. A size at zero shows as sold out and
          cannot be ordered. For something sold without sizes, leave the size box
          empty and use the one row.
        </p>

        <ul className="mt-4 space-y-2">
          {form.variants.map((v, i) => (
            <li key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor={`size-${i}`} className="block text-[12px] font-medium">
                  Size
                </label>
                <input
                  id={`size-${i}`}
                  value={v.size}
                  onChange={(e) => setVariant(i, { size: e.target.value })}
                  placeholder="M, 40, XL…"
                  className={cn(inputClass(), "mt-1 h-10")}
                />
              </div>
              <div className="w-28">
                <label htmlFor={`stock-${i}`} className="block text-[12px] font-medium">
                  In stock
                </label>
                <input
                  id={`stock-${i}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={v.stock}
                  onChange={(e) => setVariant(i, { stock: e.target.value })}
                  className={cn(inputClass(), "tabular mt-1 h-10")}
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariant(i)}
                disabled={form.variants.length === 1}
                aria-label={`Remove size ${v.size || i + 1}`}
                className="mb-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-ink-muted transition-colors duration-[var(--dur-base)] hover:border-sale hover:text-sale disabled:opacity-30 disabled:hover:border-line-strong disabled:hover:text-ink-muted"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addVariant}
          className="mt-3 inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
        >
          Add a size
        </button>

        {product ? (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-subtle px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
            Stock goes down on its own as orders come in. You only need to change
            these numbers when new stock arrives.
          </p>
        ) : null}
      </Card>

      {/* --------------------------------------------------------- pictures */}
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Pictures</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          The main picture is the one customers see everywhere. The second is
          shown when they hover over it — it is optional.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AssetPicker
            label="Main picture"
            assets={assets}
            value={form.primaryAssetId}
            onChange={(id: string | null) => set("primaryAssetId", id)}
          />
          <AssetPicker
            label="Second picture (optional)"
            assets={assets}
            value={form.hoverAssetId}
            onChange={(id: string | null) => set("hoverAssetId", id)}
          />
        </div>
      </Card>

      {/* ---------------------------------------------------------- details */}
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Details and colours</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Short facts customers scan — fabric, fit, care. These sell clothes far
          better than long descriptions do.
        </p>

        <ul className="mt-4 space-y-2">
          {form.details.map((d, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={d}
                aria-label={`Detail ${i + 1}`}
                onChange={(e) =>
                  set("details", form.details.map((x, idx) => (idx === i ? e.target.value : x)))
                }
                placeholder="100% cotton"
                className={cn(inputClass(), "h-10")}
              />
              <button
                type="button"
                onClick={() => set("details", form.details.filter((_, idx) => idx !== i))}
                aria-label={`Remove detail ${i + 1}`}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong text-ink-muted transition-colors duration-[var(--dur-base)] hover:border-sale hover:text-sale"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => set("details", [...form.details, ""])}
          className="mt-3 inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
        >
          Add a detail
        </button>

        <div className="mt-5">
          <Field
            label="Colours"
            id="p-colors"
            hint="Separate with commas. These are labels only — stock is counted by size."
          >
            <input
              id="p-colors"
              value={form.colors.join(", ")}
              onChange={(e) =>
                set("colors", e.target.value.split(",").map((c) => c.trim()).filter(Boolean))
              }
              placeholder="Off White, Black, Navy"
              className={inputClass()}
            />
          </Field>
        </div>
      </Card>

      {/* --------------------------------------------------------- shopfront */}
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">On the shop</h2>
        <div className="mt-4 space-y-4">
          <Field label="Badge" id="p-badge" hint="A small label on the corner of the picture. Only one shows.">
            <select
              id="p-badge"
              value={form.badge}
              onChange={(e) => set("badge", e.target.value as ProductBadgeValue | "")}
              className={inputClass()}
            >
              <option value="">No badge</option>
              <option value="NEW">New</option>
              <option value="BESTSELLER">Bestseller</option>
              <option value="LIMITED">Limited</option>
            </select>
          </Field>

          <label className="flex items-start gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
            />
            <span>
              Show on the shop
              <span className="mt-0.5 block text-[12px] text-ink-muted">
                Uncheck to take it down without deleting it. Past orders keep it.
              </span>
            </span>
          </label>

          {/*
            The web address is generated from the name and shown only for an
            existing product, where changing it is a real decision — links
            customers and Google already hold stop working.
          */}
          {product ? (
            <details className="rounded-[var(--radius-sm)] border border-line bg-subtle px-3.5 py-2.5">
              <summary className="cursor-pointer text-[13px] font-medium">
                Web address and search listing
              </summary>
              <div className="mt-3 space-y-4">
                <Field
                  label="Web address"
                  id="p-slug"
                  hint="Changing this breaks any link people already have. Usually leave it alone."
                >
                  <input
                    id="p-slug"
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    className={cn(inputClass(), "font-mono text-[13px]")}
                  />
                </Field>
                <Field label="Search engine title" id="p-seo-title" hint="Leave empty to use the product name.">
                  <input
                    id="p-seo-title"
                    value={form.seoTitle}
                    onChange={(e) => set("seoTitle", e.target.value)}
                    className={inputClass()}
                  />
                </Field>
                <Field
                  label="Search engine description"
                  id="p-seo-desc"
                  hint="Leave empty to use the description above."
                >
                  <textarea
                    id="p-seo-desc"
                    rows={2}
                    value={form.seoDescription}
                    onChange={(e) => set("seoDescription", e.target.value)}
                    className={cn(inputClass(), "h-auto py-2.5")}
                  />
                </Field>
              </div>
            </details>
          ) : null}
        </div>
      </Card>

      {/* ------------------------------------------------------------ save */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Add product"}
        </Button>
        <Link
          href="/admin/products"
          className="inline-flex h-[52px] items-center rounded-[var(--radius-sm)] px-4 text-[15px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:text-ink"
        >
          Cancel
        </Link>

        {product ? (
          <div className="ml-auto flex items-center gap-2">
            {confirmingDelete ? (
              <>
                <span className="text-[13px] text-ink-soft">Delete permanently?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-sale px-4 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex h-10 items-center rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:text-sale"
              >
                Delete
              </button>
            )}
          </div>
        ) : null}
      </div>

      {product && !form.isActive ? (
        <p className="text-[13px] text-ink-muted">
          <Pill tone="off">Hidden</Pill> This product is not on the shop right now.
        </p>
      ) : null}
    </form>
  );
}
