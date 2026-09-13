"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card, Pill, EmptyState } from "./admin-ui";
import { useToast } from "./toast";
import { AssetPicker } from "./asset-picker";
import {
  deleteCategory,
  reorderCategories,
  saveCategory,
} from "@/lib/admin/catalog-actions";
import type { AdminCategoryRow, AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * Categories, with their order.
 *
 * Reordering is up/down buttons rather than drag and drop. Dragging is nicer
 * with a mouse and close to unusable on a phone next to a scrolling list — and
 * the person running this shop will be doing it on a phone. Buttons also work
 * with a keyboard and announce themselves, which dragging does not.
 */
export function CategoryManager({
  categories,
  assets,
}: {
  categories: AdminCategoryRow[];
  assets: AssetRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(categories);
  const [editing, setEditing] = useState<AdminCategoryRow | "new" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    // Optimistic: the list is the thing being manipulated, and waiting for a
    // round trip between each tap makes reordering ten categories feel broken.
    setOrder(next);
    setFailure(null);

    startTransition(async () => {
      const result = await reorderCategories(next.map((c) => c.id));
      if (!result.ok) {
        setOrder(order);
        toast.error(result.message);
      }
    });
  }

  function remove(row: AdminCategoryRow) {
    setFailure(null);
    startTransition(async () => {
      const result = await deleteCategory(row.id);
      if (!result.ok) {
        // A refusal here is a sentence explaining what to do instead, so it
        // stays on screen rather than disappearing with a toast.
        setFailure(result.message);
        return;
      }
      toast.success(`${row.name} deleted.`);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <CategoryForm
        category={editing === "new" ? null : editing}
        assets={assets}
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
          Add category
        </Button>
      </div>

      {failure ? (
        <p
          role="alert"
          className="mb-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[13px] leading-relaxed text-sale"
        >
          {failure}
        </p>
      ) : null}

      {order.length === 0 ? (
        <EmptyState
          title="No categories yet"
          body="Categories group your products and fill the rail under the homepage banner."
        />
      ) : (
        <ul className="space-y-2">
          {order.map((c, i) => (
            <li
              key={c.id}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] border bg-canvas p-3",
                c.isActive ? "border-line" : "border-dashed border-line-strong",
              )}
            >
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || pending}
                  aria-label={`Move ${c.name} up`}
                  className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1 || pending}
                  aria-label={`Move ${c.name} down`}
                  className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent"
                >
                  ↓
                </button>
              </div>

              <span className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-subtle">
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt="" fill sizes="48px" quality={60} className="object-cover" />
                ) : null}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{c.name}</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  {c.tagline ? ` · ${c.tagline}` : ""}
                </p>
                {!c.isActive ? (
                  <span className="mt-1 inline-block">
                    <Pill tone="off">Hidden</Pill>
                  </span>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  disabled={pending}
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:text-sale disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  assets,
  onDone,
  onCancel,
}: {
  category: AdminCategoryRow | null;
  assets: AssetRow[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    tagline: category?.tagline ?? "",
    imageId: category?.imageId ?? null,
    isActive: category?.isActive ?? true,
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await saveCategory({ id: category?.id, ...form });
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      toast.success(category ? `${form.name} saved.` : `${form.name} added.`);
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl">
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">
          {category ? `Edit ${category.name}` : "New category"}
        </h2>

        {failure ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-sale"
          >
            {failure}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <Field label="Name" id="c-name" required>
            <input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass()}
            />
          </Field>

          <Field
            label="Short line"
            id="c-tagline"
            hint="Shown under the name on the category page. Optional."
          >
            <input
              id="c-tagline"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className={inputClass()}
            />
          </Field>

          <AssetPicker
            label="Picture"
            assets={assets}
            value={form.imageId}
            onChange={(id: string | null) => setForm({ ...form, imageId: id })}
          />

          <label className="flex items-start gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
            />
            <span>
              Show on the shop
              <span className="mt-0.5 block text-[12px] text-ink-muted">
                Hiding a category also hides its page. The products in it stay
                where they are.
              </span>
            </span>
          </label>

          {category ? (
            <details className="rounded-[var(--radius-sm)] border border-line bg-subtle px-3.5 py-2.5">
              <summary className="cursor-pointer text-[13px] font-medium">Web address</summary>
              <div className="mt-3">
                <Field
                  label="Web address"
                  id="c-slug"
                  hint="Changing this breaks links people already have."
                >
                  <input
                    id="c-slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className={cn(inputClass(), "font-mono text-[13px]")}
                  />
                </Field>
              </div>
            </details>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : category ? "Save changes" : "Add category"}
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
