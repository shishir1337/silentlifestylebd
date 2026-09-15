"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { UploadButton } from "./upload-button";
import { useOverlay } from "@/lib/use-overlay";
import { CloseIcon } from "./admin-icons";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * All of a product's photographs, in one place.
 *
 * What this replaces: three separate controls — a slot for the main picture, a
 * slot for the hover picture, and an adder for the rest — each opening its own
 * library dialog. Putting three photographs on a product meant three trips
 * through the same grid, and the client had to know in advance which one was
 * which before they had seen any of them.
 *
 * The way a shop actually works is the other way round: photograph the garment,
 * put the pictures in, then decide which one leads. So this is one ordered grid.
 * Drop a dozen files on it, or pick from the library, and then say which is
 * featured — on the tiles, looking at them.
 *
 * Two roles live on the tiles rather than in separate fields:
 *
 *   Featured  the picture customers see everywhere. Exactly one, always.
 *   Hover     revealed when a pointer rests on the card. At most one, optional,
 *             and meaningless on a phone — which is why it is a quiet toggle
 *             and not a slot the client has to fill before they can save.
 *
 * Order is the gallery order on the product page. It is a sequence a shopper
 * reads — front, back, fabric — so it is arranged deliberately rather than by
 * whichever file finished uploading first.
 */

export interface MediaValue {
  primaryAssetId: string | null;
  hoverAssetId: string | null;
  galleryAssetIds: string[];
}

/** The flat, ordered list the grid renders: featured first, then hover, then the rest. */
function toOrder(value: MediaValue): string[] {
  const out: string[] = [];
  const push = (id: string | null) => {
    if (id && !out.includes(id)) out.push(id);
  };
  push(value.primaryAssetId);
  push(value.hoverAssetId);
  for (const id of value.galleryAssetIds) push(id);
  return out;
}

/** …and back, keeping the roles the client chose. */
function fromOrder(order: string[], primary: string | null, hover: string | null): MediaValue {
  const live = order.filter(Boolean);
  const nextPrimary = primary && live.includes(primary) ? primary : (live[0] ?? null);
  const nextHover = hover && live.includes(hover) && hover !== nextPrimary ? hover : null;
  return {
    primaryAssetId: nextPrimary,
    hoverAssetId: nextHover,
    galleryAssetIds: live.filter((id) => id !== nextPrimary && id !== nextHover),
  };
}

function StarIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    >
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z" />
    </svg>
  );
}

export function MediaManager({
  assets,
  value,
  onChange,
  onUploaded,
}: {
  /** The whole library, for the picker and for showing what is chosen. */
  assets: AssetRow[];
  value: MediaValue;
  /**
   * Takes an updater, not a value.
   *
   * Three files uploading in sequence each report back within milliseconds of
   * each other. A handler given a finished value computes it from the `value`
   * of the render it was created in, so the second and third arrivals are both
   * built on the state before the first — and two of the three pictures vanish.
   * An updater is applied to whatever the state actually is by then.
   */
  onChange: (update: (prev: MediaValue) => MediaValue) => void;
  /** Lets the form add a freshly uploaded picture to its own copy of the library. */
  onUploaded: (asset: AssetRow) => void;
}) {
  const [browsing, setBrowsing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const order = toOrder(value);
  const byId = new Map(assets.map((a) => [a.id, a]));

  const add = (ids: string[]) =>
    onChange((prev) => {
      const next = toOrder(prev);
      for (const id of ids) if (!next.includes(id)) next.push(id);
      return fromOrder(next, prev.primaryAssetId, prev.hoverAssetId);
    });

  const remove = (id: string) =>
    onChange((prev) =>
      fromOrder(
        toOrder(prev).filter((x) => x !== id),
        prev.primaryAssetId === id ? null : prev.primaryAssetId,
        prev.hoverAssetId === id ? null : prev.hoverAssetId,
      ),
    );

  const move = (i: number, delta: number) =>
    onChange((prev) => {
      const next = toOrder(prev);
      const t = i + delta;
      if (t < 0 || t >= next.length) return prev;
      [next[i], next[t]] = [next[t], next[i]];
      return fromOrder(next, prev.primaryAssetId, prev.hoverAssetId);
    });

  const setFeatured = (id: string) =>
    onChange((prev) =>
      fromOrder(toOrder(prev), id, prev.hoverAssetId === id ? null : prev.hoverAssetId),
    );

  const toggleHover = (id: string) =>
    onChange((prev) =>
      fromOrder(toOrder(prev), prev.primaryAssetId, prev.hoverAssetId === id ? null : id),
    );

  return (
    <div>
      {/* ------------------------------------------------------------ grid */}
      {/*
        Three across at most. Four made the tiles narrow enough to clip the
        "Featured" badge and push a reorder arrow off the edge — and a wall of
        thumbnails is harder to judge than a row of them, which is the whole job
        of this grid.
      */}
      {order.length > 0 ? (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {order.map((id, i) => {
            const asset = byId.get(id);
            const featured = id === value.primaryAssetId;
            const hover = id === value.hoverAssetId;
            return (
              <li
                key={id}
                className={cn(
                  "overflow-hidden rounded-[var(--radius-md)] border bg-surface transition-colors duration-[var(--dur-base)]",
                  featured ? "border-ink ring-1 ring-ink" : "border-line",
                )}
              >
                <div className="relative aspect-square bg-muted">
                  {asset ? (
                    <Image
                      src={thumbOf(asset)}
                      alt={asset.alt ?? ""}
                      fill
                      sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                      quality={60}
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] text-ink-muted">
                      No longer in the library
                    </span>
                  )}
                  {asset ? <VideoMark asset={asset} /> : null}

                  {featured ? (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                      <StarIcon filled className="size-2.5" />
                      Featured
                    </span>
                  ) : hover ? (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-canvas/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-soft uppercase">
                      Hover
                    </span>
                  ) : (
                    <span className="tabular absolute top-1.5 left-1.5 inline-flex size-5 items-center justify-center rounded-full bg-ink/70 text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => remove(id)}
                    aria-label={`Remove picture ${i + 1} from this product`}
                    title="Remove from this product"
                    className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-canvas/90 text-ink-muted transition-colors duration-[var(--dur-base)] hover:text-sale"
                  >
                    <CloseIcon className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-0.5 border-t border-line px-1 py-1">
                  <button
                    type="button"
                    onClick={() => setFeatured(id)}
                    disabled={featured}
                    aria-pressed={featured}
                    title={featured ? "This is the featured picture" : "Make this the featured picture"}
                    aria-label={featured ? "Featured picture" : `Make picture ${i + 1} featured`}
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] transition-colors duration-[var(--dur-base)]",
                      featured
                        ? "text-ink"
                        : "text-ink-muted hover:bg-muted hover:text-ink",
                    )}
                  >
                    <StarIcon filled={featured} className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleHover(id)}
                    disabled={featured}
                    aria-pressed={hover}
                    title="Show this one when a pointer rests on the product card"
                    className={cn(
                      "inline-flex h-8 items-center rounded-[var(--radius-xs)] px-1.5 text-[11px] font-medium transition-colors duration-[var(--dur-base)]",
                      hover ? "bg-muted text-ink" : "text-ink-muted hover:bg-muted hover:text-ink",
                      featured && "invisible",
                    )}
                  >
                    Hover
                  </button>

                  <div className="ml-auto flex">
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
                      disabled={i === order.length - 1}
                      aria-label={`Move picture ${i + 1} later`}
                      className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                    >
                      →
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* ------------------------------------------------------ drop target */}
      <DropZone
        empty={order.length === 0}
        dragging={dragging}
        setDragging={setDragging}
        onFiles={(files) => {
          const input = document.getElementById("product-upload") as HTMLInputElement | null;
          if (!input) return;
          // Hand the dropped files to the same input the button uses, so there
          // is one upload path to get right rather than two.
          const data = new DataTransfer();
          for (const f of files) data.items.add(f);
          input.files = data.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }}
        onBrowse={() => setBrowsing(true)}
        uploader={
          <UploadButton
            multiple
            accept="both"
            id="product-upload"
            label={order.length > 0 ? "Upload more" : "Photos or video"}
            onUploaded={(asset) => {
              onUploaded(asset);
              add([asset.id]);
            }}
          />
        }
      />

      {browsing ? (
        <LibraryPicker
          assets={assets.filter((a) => !order.includes(a.id))}
          onClose={() => setBrowsing(false)}
          onPick={(ids) => {
            add(ids);
            setBrowsing(false);
          }}
        />
      ) : null}
    </div>
  );
}

function DropZone({
  empty,
  dragging,
  setDragging,
  onFiles,
  onBrowse,
  uploader,
}: {
  empty: boolean;
  dragging: boolean;
  setDragging: (v: boolean) => void;
  onFiles: (files: File[]) => void;
  onBrowse: () => void;
  uploader: React.ReactNode;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        if (files.length > 0) onFiles(files);
      }}
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-[var(--radius-md)] border border-dashed px-4 text-center transition-colors duration-[var(--dur-base)]",
        empty ? "py-10" : "py-6",
        dragging ? "border-ink bg-muted" : "border-line-strong",
      )}
    >
      <p className="text-[13.5px] font-medium">
        {empty ? "No pictures yet" : "Add more pictures"}
      </p>
      <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
        Drop several photographs here at once, or choose them from your computer.
        The first one is the picture customers see everywhere — you can change
        which one that is afterwards.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {uploader}
        <button
          type="button"
          onClick={onBrowse}
          className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
        >
          Choose from library
        </button>
      </div>
    </div>
  );
}

/**
 * The library, with more than one picture selectable at a time.
 *
 * The old dialog closed on the first tap. Putting four archive shots on a
 * product meant opening it four times, and the grid scrolled back to the top
 * each time.
 */
function LibraryPicker({
  assets,
  onPick,
  onClose,
}: {
  assets: AssetRow[];
  onPick: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { mounted, ref: attach, node } = useOverlay(true);
  const [chosen, setChosen] = useState<string[]>([]);
  const closing = useRef(false);

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const onCloseEvent = () => {
      if (!closing.current) onClose();
    };
    el.addEventListener("close", onCloseEvent);
    return () => el.removeEventListener("close", onCloseEvent);
  }, [node, onClose, mounted]);

  if (!mounted) return null;

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <dialog
      ref={attach}
      onClick={(e) => {
        if (e.target === node.current) onClose();
      }}
      className="m-0 mt-auto max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-[var(--radius-lg)] bg-canvas p-0 sm:m-auto sm:rounded-[var(--radius-lg)] backdrop:bg-ink/40"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-canvas px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">
          Your pictures
          {chosen.length > 0 ? (
            <span className="ml-2 text-[13px] font-normal text-ink-muted">
              {chosen.length} selected
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              closing.current = true;
              onPick(chosen);
            }}
            disabled={chosen.length === 0}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-ink px-3.5 text-[13px] font-medium text-white disabled:opacity-40"
          >
            Add {chosen.length > 0 ? chosen.length : ""}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] hover:bg-muted"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {assets.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-ink-muted">
            Every picture in your library is already on this product.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {assets.map((a) => {
              const picked = chosen.includes(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    aria-pressed={picked}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-[var(--radius-sm)] border bg-muted transition-colors duration-[var(--dur-base)]",
                      picked ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink",
                    )}
                  >
                    <Image
                      src={thumbOf(a)}
                      alt={a.alt ?? a.filePath}
                      fill
                      sizes="(min-width: 640px) 140px, 30vw"
                      quality={60}
                      className="object-cover"
                    />
                    <VideoMark asset={a} />
                    {picked ? (
                      <span className="absolute top-1 right-1 inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                        {chosen.indexOf(a.id) + 1}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}

/* --- video in the library -------------------------------------------------- */

/**
 * What to show in a grid square.
 *
 * A video's poster, never the video itself: a media library of twelve squares
 * that each start downloading an MP4 to paint a first frame is the kind of
 * page that is quietly unusable on the connection this shop's client actually
 * has. `posterUrl` is a still ImageKit renders on request.
 */
export function thumbOf(asset: { url: string; kind: "IMAGE" | "VIDEO"; posterUrl: string | null }): string {
  return asset.kind === "VIDEO" ? (asset.posterUrl ?? asset.url) : asset.url;
}

/** `2:14`, or null when ImageKit did not report a duration. */
function runtimeOf(seconds: number | null): string | null {
  if (!seconds || seconds < 1) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The play triangle and runtime over a video thumbnail.
 *
 * Without it a video is a still frame that behaves unlike every other square
 * in the grid — and the person arranging a product's media needs to know which
 * one is the clip before they drag it into first place, not after.
 */
export function VideoMark({
  asset,
}: {
  asset: { kind: "IMAGE" | "VIDEO"; durationSeconds: number | null };
}) {
  if (asset.kind !== "VIDEO") return null;
  const runtime = runtimeOf(asset.durationSeconds);

  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/20"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-ink/80 shadow-[var(--shadow-pop)]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 translate-x-px text-white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-[var(--radius-xs)] bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase">
        {runtime ? <span className="tabular">{runtime}</span> : "Video"}
      </span>
    </>
  );
}
