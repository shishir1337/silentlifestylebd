"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui/field";
import { Card, EmptyState, Pill } from "./admin-ui";
import { UploadButton } from "./upload-button";
import { useToast } from "./toast";
import { deleteAsset } from "@/lib/admin/media-actions";
import { updateAssetAlt } from "@/lib/admin/catalog-actions";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/**
 * The media library.
 *
 * Every image says where it is used. That is the difference between a picture
 * grid and something safe to tidy up in: the client can see that deleting this
 * one would empty a product page, before they try.
 *
 * Alt text is editable here because it is the one part of an image that is
 * text, and on the hero banners it is the *only* machine-readable version of
 * the wording baked into the artwork — the single thing a screen reader or
 * Google can read.
 */
export function MediaLibrary({ assets }: { assets: AssetRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [library, setLibrary] = useState(assets);
  const [failure, setFailure] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">
          {library.length} {library.length === 1 ? "picture" : "pictures"}
        </p>
        <UploadButton
          onUploaded={(asset) => {
            setLibrary((prev) => [asset, ...prev]);
            toast.success("Picture uploaded.");
            // Bring back the real URL, dimensions and file path from the server.
            router.refresh();
          }}
        />
      </div>

      {failure ? (
        <p
          role="alert"
          className="mb-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[13px] leading-relaxed text-sale"
        >
          {failure}
        </p>
      ) : null}

      {library.length === 0 ? (
        <EmptyState
          title="No pictures yet"
          body="Upload product photos and banners here, then choose them when editing a product."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {library.map((a) => (
            <li key={a.id}>
              <Card className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(open === a.id ? null : a.id)}
                  aria-expanded={open === a.id}
                  className="block w-full text-left"
                >
                  <span className="relative block aspect-square bg-subtle">
                    {a.url ? (
                      <Image
                        src={a.url}
                        alt={a.alt ?? ""}
                        fill
                        sizes="(min-width:1024px) 22vw, (min-width:640px) 30vw, 45vw"
                        quality={60}
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="block p-2.5">
                    <span className="block truncate text-[12px] font-medium">
                      {a.filePath.split("/").pop()}
                    </span>
                    <span className="tabular mt-0.5 block text-[11px] text-ink-muted">
                      {a.width}×{a.height} · {Math.max(1, Math.round(a.bytes / 1024))} KB
                    </span>
                    <span className="mt-1.5 block">
                      {a.usedBy.length === 0 ? (
                        <Pill tone="off">Unused</Pill>
                      ) : (
                        <Pill tone="on">
                          Used {a.usedBy.length}×
                        </Pill>
                      )}
                    </span>
                  </span>
                </button>

                {open === a.id ? (
                  <AssetDetail
                    asset={a}
                    onFailure={setFailure}
                    onDeleted={() => {
                      setLibrary((prev) => prev.filter((x) => x.id !== a.id));
                      setOpen(null);
                    }}
                  />
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssetDetail({
  asset,
  onFailure,
  onDeleted,
}: {
  asset: AssetRow;
  onFailure: (message: string | null) => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [alt, setAlt] = useState(asset.alt ?? "");
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="border-t border-line p-2.5">
      <label htmlFor={`alt-${asset.id}`} className="block text-[11px] font-medium">
        Description for screen readers
      </label>
      <input
        id={`alt-${asset.id}`}
        value={alt}
        onChange={(e) => {
          setAlt(e.target.value);
          setSaved(false);
        }}
        placeholder="What the picture shows"
        className={cn(inputClass(), "mt-1 h-9 text-[13px]")}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          onFailure(null);
          startTransition(async () => {
            const result = await updateAssetAlt(asset.id, alt);
            if (!result.ok) onFailure(result.message);
            else setSaved(true);
          });
        }}
        className="mt-2 inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12px] font-medium hover:border-ink disabled:opacity-50"
      >
        {pending ? "Saving…" : saved ? "Saved" : "Save description"}
      </button>

      {asset.usedBy.length > 0 ? (
        <div className="mt-3 border-t border-line pt-2.5">
          <p className="text-[11px] font-semibold text-ink-muted uppercase">Used in</p>
          <ul className="mt-1 space-y-0.5 text-[12px] text-ink-soft">
            {asset.usedBy.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-3 border-t border-line pt-2.5">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px]">Delete for good?</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  onFailure(null);
                  startTransition(async () => {
                    const result = await deleteAsset(asset.id);
                    if (!result.ok) {
                      onFailure(result.message);
                      setConfirming(false);
                    } else onDeleted();
                  });
                }}
                className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-sale px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12px] font-medium"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-[12px] font-medium text-ink-muted transition-colors duration-[var(--dur-base)] hover:text-sale"
            >
              Delete this picture
            </button>
          )}
        </div>
      )}
    </div>
  );
}
