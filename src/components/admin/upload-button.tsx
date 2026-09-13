"use client";

import { useRef, useState } from "react";
import { createUploadAuth, recordUpload } from "@/lib/admin/media-actions";
import type { AssetRow } from "@/lib/admin/catalog-reads";

/** ImageKit's own limit on the free and starter plans, and plenty for a photo. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Upload a picture.
 *
 * The file goes from the browser straight to ImageKit, using a signature this
 * server minted moments earlier. It never passes through the app — a single VPS
 * has better things to do than buffer a 4 MB photo on its way somewhere else,
 * and the private key stays where it belongs.
 *
 * Afterwards the server is told the file id and reads the real details back
 * from ImageKit itself, so what lands in the database is what ImageKit has,
 * not what a browser claimed.
 */
export function UploadButton({ onUploaded }: { onUploaded: (asset: AssetRow) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Let the same file be chosen again after a failure.
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError("Pick a JPG, PNG or WebP picture.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`That picture is ${Math.round(file.size / 1024 / 1024)} MB. The limit is 25 MB.`);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const auth = await createUploadAuth();

      const body = new FormData();
      body.append("file", file);
      body.append("fileName", file.name);
      body.append("folder", auth.folder);
      body.append("publicKey", auth.publicKey);
      body.append("token", auth.token);
      body.append("expire", String(auth.expire));
      body.append("signature", auth.signature);
      // Keep the customer's filename rather than a random one, so the media
      // library is browsable by a human later.
      body.append("useUniqueFileName", "true");

      const res = await fetch(auth.uploadUrl, { method: "POST", body });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message ?? `Upload failed (${res.status})`);
      }
      const uploaded = (await res.json()) as { fileId?: string };
      if (!uploaded.fileId) throw new Error("Upload finished without a file id.");

      const recorded = await recordUpload({ fileId: uploaded.fileId });
      if (!recorded.ok) throw new Error(recorded.message);

      // The real URL and dimensions arrive on the next server render. What
      // matters right now is that the picker can show and select it.
      const preview = await previewOf(file);
      onUploaded({
        id: recorded.id!,
        filePath: file.name,
        alt: null,
        bytes: file.size,
        createdAt: new Date().toISOString(),
        usedBy: [],
        ...preview,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span role="alert" className="max-w-[16rem] text-[12px] text-sale">
          {error}
        </span>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={onPick}
        className="sr-only"
        id="admin-upload"
      />
      <label
        htmlFor="admin-upload"
        className="inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-sm)] bg-ink px-3.5 text-[13px] font-medium text-white transition-[background-color,opacity] duration-[var(--dur-base)] hover:bg-ink/90 aria-disabled:opacity-50"
        aria-disabled={busy}
      >
        {busy ? "Uploading…" : "Upload"}
      </label>
    </div>
  );
}

/**
 * A local preview so the newly chosen picture appears at once.
 *
 * The blob URL lives only until the page is reloaded, at which point the real
 * ImageKit URL has arrived from the server. Showing nothing for that second
 * reads as a failed upload.
 */
async function previewOf(file: File): Promise<{ url: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
    return { url, ...size };
  } catch {
    return { url, width: 0, height: 0 };
  }
}
