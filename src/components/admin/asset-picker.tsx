"use client";

import { useState } from "react";
import Image from "next/image";
import { useOverlay } from "@/lib/use-overlay";
import { UploadButton } from "./upload-button";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * Choose a picture, or add one.
 *
 * A native `<dialog>` so the browser supplies the focus trap, the Escape key
 * and an inert background — three things a hand-rolled modal gets subtly wrong
 * and nobody notices until someone uses a keyboard.
 *
 * Uploading happens inside the picker rather than on a separate page: the
 * moment somebody wants a photo is the moment they are looking at the empty
 * slot, and sending them elsewhere to come back is how a five-second task
 * becomes a support question.
 */
export function AssetPicker({
  label,
  assets,
  value,
  onChange,
  compact,
}: {
  label: string;
  assets: AssetRow[];
  value: string | null;
  onChange: (assetId: string | null) => void;
  /**
   * Renders as a single button rather than a labelled slot.
   *
   * The slot form answers "which picture is the main one"; the compact form
   * answers "add one more". Showing an empty 96px preview above an adder that
   * never keeps what it is given is a placeholder for nothing.
   */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, ref: attach, node } = useOverlay(open);
  /*
    Pictures only, deliberately.

    This picker fills the single-image slots — a category tile, a hero banner,
    a promo tile — and every one of those renders through `next/image` into a
    fixed box. A video in any of them is a broken tile, so it is not offered
    here at all rather than offered and then refused on save. Product galleries
    use the media manager, which does take video.
  */
  const [library, setLibrary] = useState(assets.filter((a) => a.kind !== "VIDEO"));

  const selected = library.find((a) => a.id === value) ?? null;

  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div>
      {compact ? null : <p className="text-[13px] font-medium">{label}</p>}

      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong px-3.5 text-[13px] font-medium text-ink-soft transition-colors duration-[var(--dur-base)] hover:border-ink hover:text-ink"
        >
          + {label}
        </button>
      ) : (
      <div className="mt-1.5 flex items-start gap-3">
        <span className="relative size-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-subtle">
          {selected ? (
            <Image
              src={selected.url}
              alt=""
              fill
              sizes="96px"
              quality={60}
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-[11px] text-ink-muted">
              None
            </span>
          )}
        </span>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
          >
            {selected ? "Change" : "Choose a picture"}
          </button>
          {selected ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:text-sale"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      )}

      {mounted ? (
        <dialog
          ref={attach}
          onClick={(e) => {
            if (e.target === node.current) setOpen(false);
          }}
          className={cn(
            "m-0 max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-[var(--radius-lg)] bg-canvas p-0 sm:rounded-[var(--radius-lg)]",
            "mt-auto sm:m-auto",
            "backdrop:bg-ink/40",
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-canvas px-5 py-3.5">
            <h2 className="text-[15px] font-semibold">{label}</h2>
            <div className="flex items-center gap-2">
              <UploadButton
                onUploaded={(asset) => {
                  setLibrary((prev) => [asset, ...prev]);
                  choose(asset.id);
                }}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-5">
            {library.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-ink-muted">
                No pictures yet. Use “Upload” above to add one.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {library.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => choose(a.id)}
                      aria-pressed={a.id === value}
                      className={cn(
                        "block w-full overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors duration-[var(--dur-base)]",
                        a.id === value
                          ? "border-ink"
                          : "border-transparent hover:border-line-strong",
                      )}
                    >
                      <span className="relative block aspect-square bg-subtle">
                        <Image
                          src={a.url}
                          alt={a.alt ?? ""}
                          fill
                          sizes="(min-width:640px) 20vw, 30vw"
                          quality={60}
                          className="object-cover"
                        />
                      </span>
                      <span className="block truncate px-1.5 py-1 text-left text-[11px] text-ink-muted">
                        {a.filePath.split("/").pop()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
