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
 *
 * Several files at once, and one at a time on the wire. A shop photographs a
 * garment front, back and detail in one sitting and has no reason to do three
 * round trips through a file dialog — but each upload still needs its own
 * signature, and firing ten at a browser's six-connection limit only makes the
 * last one slower. They go in sequence with a count on the button, so a slow
 * connection looks like progress rather than a hang.
 */
export function UploadButton({
  onUploaded,
  multiple = false,
  label = "Upload",
  id = "admin-upload",
}: {
  onUploaded: (asset: AssetRow) => void;
  multiple?: boolean;
  label?: string;
  id?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    // Let the same file be chosen again after a failure.
    e.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    setProgress(files.length > 1 ? { done: 0, total: files.length } : null);

    const refused: string[] = [];
    for (const [i, file] of files.entries()) {
      if (files.length > 1) setProgress({ done: i, total: files.length });
      const problem = await upload(file);
      if (problem) refused.push(`${file.name}: ${problem}`);
    }

    setBusy(false);
    setProgress(null);
    /*
      One bad file out of five must not throw away the four that worked, so
      each is reported by name. The others are already on screen.
    */
    setError(refused.length > 0 ? refused.join(" · ") : null);
  }

  /** Uploads one file. Returns a sentence on failure, null on success. */
  async function upload(file: File): Promise<string | null> {
    if (!ACCEPTED.includes(file.type)) return "not a JPG, PNG or WebP";
    if (file.size > MAX_BYTES) {
      return `${Math.round(file.size / 1024 / 1024)} MB, over the 25 MB limit`;
    }

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
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "upload failed";
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
        multiple={multiple}
        onChange={onPick}
        className="sr-only"
        id={id}
      />
      <label
        htmlFor={id}
        className="inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-sm)] bg-ink px-3.5 text-[13px] font-medium text-white transition-[background-color,opacity] duration-[var(--dur-base)] hover:bg-ink/90 aria-disabled:opacity-50"
        aria-disabled={busy}
        aria-live="polite"
      >
        {busy
          ? progress
            ? `Uploading ${progress.done + 1} of ${progress.total}…`
            : "Uploading…"
          : label}
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
