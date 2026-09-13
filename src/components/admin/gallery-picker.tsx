"use client";

import Image from "next/image";
import { AssetPicker } from "./asset-picker";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * The rest of a product's photographs.
 *
 * The form used to offer exactly two pictures — the main one and the hover —
 * because that is all the storefront showed. The gallery on the product page
 * has always handled any number; nothing was ever filling it. A shop selling
 * clothes has a front, a back and a detail shot, and a client who cannot add
 * the third one is a client who phones a developer to do it.
 *
 * Order is explicit and manual. A shopper swiping a filmstrip reads it as a
 * sequence — front, back, fabric close-up — and sorting by upload date would
 * make that sequence an accident of which file finished uploading first.
 *
 * Nothing is removed from the media library here. A picture taken off one
 * product is very often on another, and a control labelled "Remove" that
 * deleted the file would be the most expensive mistap in the panel.
 */
export function GalleryPicker({
  assets,
  value,
  onChange,
  exclude,
}: {
  assets: AssetRow[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** The main and hover pictures, so they cannot be added twice. */
  exclude: (string | null)[];
}) {
  const taken = new Set(exclude.filter(Boolean) as string[]);
  const byId = new Map(assets.map((a) => [a.id, a]));

  const move = (i: number, delta: number) => {
    const t = i + delta;
    if (t < 0 || t >= value.length) return;
    const next = [...value];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  return (
    <div>
      {value.length > 0 ? (
        <ul className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {value.map((id, i) => {
            const asset = byId.get(id);
            return (
              <li
                key={id}
                className="overflow-hidden rounded-[var(--radius-sm)] border border-line bg-surface"
              >
                <div className="relative aspect-square bg-muted">
                  {asset ? (
                    <Image
                      src={asset.url}
                      alt={asset.alt ?? ""}
                      fill
                      sizes="(min-width: 640px) 180px, 45vw"
                      quality={60}
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] text-ink-muted">
                      This picture is no longer in the library
                    </span>
                  )}
                  <span className="absolute top-1.5 left-1.5 inline-flex size-5 items-center justify-center rounded-full bg-ink/80 text-[10px] font-semibold text-white">
                    {i + 3}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 px-1 py-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move picture ${i + 1} earlier`}
                    className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                    aria-label={`Move picture ${i + 1} later`}
                    className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    className={cn(
                      "ml-auto inline-flex h-8 items-center rounded-[var(--radius-xs)] px-2",
                      "text-[12px] font-medium text-ink-muted hover:text-sale",
                    )}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/*
        The picker is a chooser, not a slot: it reports a pick, the pick is
        appended, and it clears itself for the next one. Adding five pictures
        is five taps in one place rather than five empty slots to find.
      */}
      <AssetPicker
        compact
        label={value.length > 0 ? "Add another picture" : "Add pictures"}
        assets={assets.filter((a) => !taken.has(a.id) && !value.includes(a.id))}
        value={null}
        onChange={(id) => {
          if (id && !value.includes(id) && !taken.has(id)) onChange([...value, id]);
        }}
      />
    </div>
  );
}
