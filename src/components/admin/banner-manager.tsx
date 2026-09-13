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
  deleteHeroSlide,
  reorderHeroSlides,
  saveHeroSlide,
} from "@/lib/admin/content-actions";
import type { AdminHeroSlide } from "@/lib/admin/content-reads";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * Homepage banners.
 *
 * Two pictures per banner, and the sizes are not interchangeable: 1920×600 for
 * desktop, 1000×700 for phones. Within a breakpoint every slide must share a
 * ratio, or the flex track takes the tallest and the carousel changes height
 * as it scrolls. That was found and fixed once already; a well-meaning upload
 * of a square photo would bring it straight back, so the server refuses it and
 * this screen says why before anybody tries.
 *
 * The description field is required and explained, because the artwork carries
 * every word of the message — it is the only version a screen reader or Google
 * will ever see.
 */
const DESKTOP = "1920 × 600";
const MOBILE = "1000 × 700";

export function BannerManager({
  slides,
  assets,
}: {
  slides: AdminHeroSlide[];
  assets: AssetRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(slides);
  const [editing, setEditing] = useState<AdminHeroSlide | "new" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    startTransition(async () => {
      const result = await reorderHeroSlides(next.map((s) => s.id));
      if (!result.ok) {
        setOrder(order);
        toast.error(result.message);
      }
    });
  }

  function remove(slide: AdminHeroSlide) {
    setFailure(null);
    startTransition(async () => {
      const result = await deleteHeroSlide(slide.id);
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      toast.success(`Banner “${slide.label}” removed.`);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <BannerForm
        slide={editing === "new" ? null : editing}
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">
          Wide picture {DESKTOP} · phone picture {MOBILE}
        </p>
        <Button type="button" onClick={() => setEditing("new")}>
          Add banner
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
          title="No banners"
          body="The homepage opens with these. Add one and it appears at the top of the shop."
        />
      ) : (
        <ul className="space-y-3">
          {order.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "overflow-hidden rounded-[var(--radius-md)] border bg-canvas shadow-[var(--shadow-card)]",
                s.isActive ? "border-line" : "border-dashed border-line-strong",
              )}
            >
              <div className="relative aspect-16/5 bg-subtle">
                <Image
                  src={s.desktopUrl}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 60vw, 92vw"
                  quality={60}
                  className={cn("object-cover", !s.isActive && "opacity-50")}
                />
              </div>

              <div className="flex flex-wrap items-start gap-3 p-3">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || pending}
                    aria-label={`Move ${s.label} earlier`}
                    className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted hover:text-ink disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1 || pending}
                    aria-label={`Move ${s.label} later`}
                    className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted hover:text-ink disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-medium">{s.label}</p>
                    {!s.isActive ? <Pill tone="off">Hidden</Pill> : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-soft">{s.alt}</p>
                  <p className="tabular mt-1 text-[11.5px] text-ink-muted">
                    Links to {s.href} · {s.desktopSize.width}×{s.desktopSize.height} and{" "}
                    {s.mobileSize.width}×{s.mobileSize.height}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium hover:border-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    disabled={pending}
                    className="inline-flex h-9 items-center rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-ink-muted hover:text-sale disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BannerForm({
  slide,
  assets,
  onDone,
  onCancel,
}: {
  slide: AdminHeroSlide | null;
  assets: AssetRow[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [form, setForm] = useState({
    desktopAssetId: slide?.desktopAssetId ?? null,
    mobileAssetId: slide?.mobileAssetId ?? null,
    alt: slide?.alt ?? "",
    href: slide?.href ?? "/collections",
    label: slide?.label ?? "",
    isActive: slide?.isActive ?? true,
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await saveHeroSlide({
        id: slide?.id,
        desktopAssetId: form.desktopAssetId ?? "",
        mobileAssetId: form.mobileAssetId ?? "",
        alt: form.alt,
        href: form.href,
        label: form.label,
        isActive: form.isActive,
      });
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      toast.success(slide ? "Banner saved." : "Banner added.");
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl">
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">
          {slide ? `Edit ${slide.label}` : "New banner"}
        </h2>

        {failure ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-sale"
          >
            {failure}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AssetPicker
            label={`Wide picture (${DESKTOP})`}
            assets={assets}
            value={form.desktopAssetId}
            onChange={(id: string | null) => setForm({ ...form, desktopAssetId: id })}
          />
          <AssetPicker
            label={`Phone picture (${MOBILE})`}
            assets={assets}
            value={form.mobileAssetId}
            onChange={(id: string | null) => setForm({ ...form, mobileAssetId: id })}
          />
        </div>

        <p className="mt-3 rounded-[var(--radius-sm)] bg-subtle px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
          Two pictures, two shapes, and they are not interchangeable. A phone
          would have to letterbox the wide one into a thin strip, and a desktop
          showing the tall one would tower over the fold. Anything a different
          shape is refused, because within one screen size every banner must
          match — otherwise the carousel changes height as it scrolls.
        </p>

        <div className="mt-4 space-y-4">
          <Field
            label="Short name"
            id="b-label"
            required
            hint="Only you see this. It labels the dot under the carousel."
          >
            <input
              id="b-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="New season"
              className={inputClass()}
            />
          </Field>

          <Field
            label="What the banner says"
            id="b-alt"
            required
            hint="Type out the words in the artwork. This is the only version a screen reader or Google can read."
          >
            <textarea
              id="b-alt"
              rows={2}
              value={form.alt}
              onChange={(e) => setForm({ ...form, alt: e.target.value })}
              placeholder="New season panjabi collection — from ৳1,290, cash on delivery"
              className={cn(inputClass(), "h-auto py-2.5")}
            />
          </Field>

          <Field
            label="Where tapping it goes"
            id="b-href"
            required
            hint="A page on this shop, starting with /."
          >
            <input
              id="b-href"
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              placeholder="/collections/panjabi"
              className={cn(inputClass(), "font-mono text-[13px]")}
            />
          </Field>

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
                Hidden banners keep their place in the order for when you bring
                them back.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : slide ? "Save banner" : "Add banner"}
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
