"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Pill } from "./admin-ui";
import { useToast } from "./toast";
import { Field, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { reorderCollections, saveCollection } from "@/lib/admin/catalog-actions";
import type { AdminCollectionRow } from "@/lib/admin/people-reads";
import type { AdminCategoryRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * The six curated sets the shop's navigation links to.
 *
 * Two kinds, and the difference is the whole screen. A **category** collection
 * is a hand-picked group — the client decides that watches belong in both Men
 * and Accessories, and that is content. A **rule** collection derives itself
 * from what products are: "New In" is every product badged new. Its rule is
 * shown but not editable, because it is a predicate in the storefront rather
 * than a setting, and pretending otherwise would offer an edit that cannot be
 * honoured.
 *
 * Slugs are not editable at all. These are linked from the header, the footer
 * and the homepage tiles; renaming one silently breaks all three.
 */
const RULE_EXPLAINS: Record<string, string> = {
  NEW: "Every product with the “New” badge.",
  BESTSELLER: "Every product with the “Bestseller” badge.",
  ON_OFFER: "Every product with an old price higher than its price.",
};

export function CollectionManager({
  collections,
  categories,
}: {
  collections: AdminCollectionRow[];
  categories: AdminCategoryRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(collections);
  const [editing, setEditing] = useState<AdminCollectionRow | null>(null);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);

    startTransition(async () => {
      const result = await reorderCollections(next.map((c) => c.id));
      if (!result.ok) {
        setOrder(order);
        toast.error(result.message);
      }
    });
  }

  if (editing) {
    return (
      <CollectionForm
        collection={editing}
        categories={categories}
        onDone={() => {
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {order.map((c, i) => (
        <li
          key={c.id}
          className={cn(
            "flex items-start gap-3 rounded-[var(--radius-md)] border bg-canvas p-3 shadow-[var(--shadow-card)]",
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

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-medium">{c.name}</p>
              {c.kind === "RULE" ? <Pill>Automatic</Pill> : <Pill tone="neutral">Chosen</Pill>}
              {!c.isActive ? <Pill tone="off">Hidden</Pill> : null}
            </div>
            <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-muted">
              {c.description}
            </p>
            <p className="mt-1 text-[12px] text-ink-muted">
              <span className="tabular">{c.productCount}</span>{" "}
              {c.productCount === 1 ? "product" : "products"}
              {c.rule ? ` · ${RULE_EXPLAINS[c.rule]}` : ""}
              {c.kind === "CATEGORY" && c.categoryIds.length > 0
                ? ` · ${c.categoryIds.length} ${c.categoryIds.length === 1 ? "category" : "categories"}`
                : ""}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(c)}
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
            >
              Edit
            </button>
            <Link
              href={`/collections/${c.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-ink-muted hover:text-brand hover:underline"
            >
              View on shop
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CollectionForm({
  collection,
  categories,
  onDone,
  onCancel,
}: {
  collection: AdminCollectionRow;
  categories: AdminCategoryRow[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: collection.name,
    description: collection.description,
    categoryIds: collection.categoryIds,
    isActive: collection.isActive,
  });

  const toggleCategory = (id: string) =>
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await saveCollection({ id: collection.id, ...form });
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      toast.success(`${form.name} saved.`);
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl">
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Edit {collection.name}</h2>

        {failure ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
          >
            {failure}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <Field label="Name" id="col-name" required>
            <input
              id="col-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass()}
            />
          </Field>

          <Field
            label="Description"
            id="col-desc"
            hint="Shown under the heading on the collection page."
          >
            <textarea
              id="col-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={cn(inputClass(), "h-auto py-2.5")}
            />
          </Field>

          {collection.kind === "CATEGORY" ? (
            <fieldset>
              <legend className="text-[13px] font-medium">Categories in this collection</legend>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                A category can belong to more than one — watches sit in both Men
                and Accessories.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = form.categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      aria-pressed={on}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
                        "transition-colors duration-[var(--dur-base)]",
                        on
                          ? "border-ink bg-ink text-white"
                          : "border-line-strong bg-canvas text-ink-soft hover:border-ink hover:text-ink",
                      )}
                    >
                      {c.name}
                      <span className={cn("tabular text-[11px]", on ? "text-white/70" : "text-ink-muted")}>
                        {c.productCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <div className="rounded-[var(--radius-sm)] border border-line bg-subtle px-3.5 py-3">
              <p className="text-[13px] font-medium">This collection fills itself</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                {collection.rule ? RULE_EXPLAINS[collection.rule] : ""} Products
                join and leave it on their own as you edit them — there is
                nothing to pick here. To change what is in it, change the
                products.
              </p>
            </div>
          )}

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
                Hiding it removes the page. Anything linking to it — the menu,
                the footer — stops working, so check those first.
              </span>
            </span>
          </label>

          <div className="rounded-[var(--radius-sm)] bg-subtle px-3.5 py-2.5">
            <p className="text-[12px] text-ink-muted">
              Web address:{" "}
              <span className="font-mono text-ink-soft">/collections/{collection.slug}</span>{" "}
              — fixed, because the menu, the footer and the homepage tiles all
              point at it.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
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
