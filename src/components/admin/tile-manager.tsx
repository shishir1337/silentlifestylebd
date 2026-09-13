"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card, Pill, EmptyState } from "./admin-ui";
import { AssetPicker } from "./asset-picker";
import { useToast } from "./toast";
import {
  deletePromoTile,
  reorderPromoTiles,
  savePromoTile,
} from "@/lib/admin/content-actions";
import type { AdminPromoTile } from "@/lib/admin/content-reads";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * The two editorial tiles on the homepage.
 *
 * Unlike the banners, the words here are real text drawn over the photo rather
 * than baked into it — so they are editable, they translate, and they keep
 * their contrast on any crop. That is also why there is no size rule: the tile
 * is a fixed box and the picture is cropped to fill it.
 */
export function TileManager({
  tiles,
  assets,
}: {
  tiles: AdminPromoTile[];
  assets: AssetRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(tiles);
  const [editing, setEditing] = useState<AdminPromoTile | "new" | null>(null);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    startTransition(async () => {
      const result = await reorderPromoTiles(next.map((t) => t.id));
      if (!result.ok) {
        setOrder(order);
        toast.error(result.message);
      }
    });
  }

  function remove(tile: AdminPromoTile) {
    startTransition(async () => {
      const result = await deletePromoTile(tile.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`“${tile.title}” removed.`);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <TileForm
        tile={editing === "new" ? null : editing}
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
          Add tile
        </Button>
      </div>

      {order.length === 0 ? (
        <EmptyState
          title="No tiles"
          body="These sit under the bestsellers and split the shop into its two audiences."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {order.map((t, i) => (
            <li
              key={t.id}
              className={cn(
                "overflow-hidden rounded-[var(--radius-md)] border bg-canvas shadow-[var(--shadow-card)]",
                t.isActive ? "border-line" : "border-dashed border-line-strong",
              )}
            >
              <div className="relative aspect-16/11 bg-subtle">
                <Image
                  src={t.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width:640px) 46vw, 92vw"
                  quality={60}
                  className={cn("object-cover", !t.isActive && "opacity-50")}
                />
                <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[15px] font-semibold text-white">{t.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[12px] text-white/85">{t.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5">
                <div className="flex shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || pending}
                    aria-label={`Move ${t.title} left`}
                    className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1 || pending}
                    aria-label={`Move ${t.title} right`}
                    className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                  >
                    →
                  </button>
                </div>
                <p className="tabular min-w-0 flex-1 truncate text-[11.5px] text-ink-muted">
                  {t.cta} → {t.href}
                </p>
                {!t.isActive ? <Pill tone="off">Hidden</Pill> : null}
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium hover:border-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  disabled={pending}
                  className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] px-2 text-[12.5px] font-medium text-ink-muted hover:text-sale disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TileForm({
  tile,
  assets,
  onDone,
  onCancel,
}: {
  tile: AdminPromoTile | null;
  assets: AssetRow[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: tile?.title ?? "",
    subtitle: tile?.subtitle ?? "",
    href: tile?.href ?? "/collections",
    cta: tile?.cta ?? "Shop now",
    assetId: tile?.assetId ?? null,
    isActive: tile?.isActive ?? true,
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await savePromoTile({
        id: tile?.id,
        title: form.title,
        subtitle: form.subtitle,
        href: form.href,
        cta: form.cta,
        assetId: form.assetId ?? "",
        isActive: form.isActive,
      });
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      toast.success(tile ? "Tile saved." : "Tile added.");
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl">
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">{tile ? `Edit ${tile.title}` : "New tile"}</h2>

        {failure ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
          >
            {failure}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <Field label="Title" id="t-title" required>
            <input
              id="t-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Men Collection"
              className={inputClass()}
            />
          </Field>

          <Field label="Subtitle" id="t-sub" hint="One line. What is in it.">
            <input
              id="t-sub"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Panjabi, formal shirts, pants, shoes, belts and watches."
              className={inputClass()}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button text" id="t-cta">
              <input
                id="t-cta"
                value={form.cta}
                onChange={(e) => setForm({ ...form, cta: e.target.value })}
                placeholder="Shop men"
                className={inputClass()}
              />
            </Field>
            <Field label="Links to" id="t-href" required>
              <input
                id="t-href"
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                className={cn(inputClass(), "font-mono text-[13px]")}
              />
            </Field>
          </div>

          <AssetPicker
            label="Picture"
            assets={assets}
            value={form.assetId}
            onChange={(id: string | null) => setForm({ ...form, assetId: id })}
          />

          <label className="flex items-start gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
            />
            <span>Show on the homepage</span>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : tile ? "Save tile" : "Add tile"}
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
