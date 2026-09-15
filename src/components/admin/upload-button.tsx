"use client";

import { useRef, useState } from "react";
import { createUploadAuth, recordUpload } from "@/lib/admin/media-actions";
import type { AssetRow } from "@/lib/admin/catalog-reads";
import { cn } from "@/lib/cn";

/** ImageKit's own limit on the free and starter plans. */
const MAX_BYTES = 25 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
/**
 * MP4 first, deliberately.
 *
 * It is the one container every phone in this market records and every browser
 * plays. WebM and QuickTime are accepted because a customer's phone or a
 * designer's Mac will produce them, and refusing the file somebody already has
 * is worse than transcoding it at ImageKit's edge.
 */
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface Job {
  name: string;
  /** 0–100 of this file's bytes, as reported by the browser. */
  pct: number;
  state: "uploading" | "saving" | "done" | "failed";
  problem?: string;
}

/**
 * Upload pictures and video.
 *
 * The file goes from the browser straight to ImageKit, using a signature this
 * server minted moments earlier. It never passes through the app — a single VPS
 * has better things to do than buffer a 20 MB video on its way somewhere else,
 * and the private key stays where it belongs.
 *
 * Afterwards the server is told the file id and reads the real details back
 * from ImageKit itself, so what lands in the database is what ImageKit has,
 * not what a browser claimed.
 *
 * ## Why XMLHttpRequest, in 2026
 *
 * `fetch` cannot report how much of a request body has been sent. There is no
 * progress event and no way to add one; the upload is opaque until it finishes.
 * That was tolerable for a 2 MB photograph and is not for a product video —
 * "Uploading…" sitting unchanged for ninety seconds on a Bangladeshi mobile
 * connection is indistinguishable from a page that has hung, and the honest
 * response to that is to press the button again. `XMLHttpRequest` still has
 * `upload.onprogress`, so it is what this uses.
 *
 * Several files at once, and one at a time on the wire. A shop photographs a
 * garment front, back and detail in one sitting and has no reason to do three
 * round trips through a file dialog — but each upload needs its own signature,
 * and firing ten at a browser's six-connection limit only makes the last one
 * slower.
 */
export function UploadButton({
  onUploaded,
  multiple = false,
  label = "Upload",
  id = "admin-upload",
  accept = "image",
}: {
  onUploaded: (asset: AssetRow) => void;
  multiple?: boolean;
  label?: string;
  id?: string;
  /** `both` opens the picker to video as well. */
  accept?: "image" | "both";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);

  const allowed = accept === "both" ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    // Let the same file be chosen again after a failure.
    e.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setJobs(files.map((f) => ({ name: f.name, pct: 0, state: "uploading" as const })));

    for (const [i, file] of files.entries()) {
      const problem = await upload(file, (pct) => {
        setJobs((prev) => prev.map((j, n) => (n === i ? { ...j, pct } : j)));
      }, () => {
        setJobs((prev) => prev.map((j, n) => (n === i ? { ...j, pct: 100, state: "saving" } : j)));
      });

      setJobs((prev) =>
        prev.map((j, n) =>
          n === i
            ? problem
              ? { ...j, state: "failed", problem }
              : { ...j, pct: 100, state: "done" }
            : j,
        ),
      );
    }

    setBusy(false);
    /*
      Successful rows clear themselves; the pictures are already on screen and
      a list of green ticks is just clutter. Failures stay until the next pick,
      because one bad file out of five must not disappear quietly.
    */
    setTimeout(() => {
      setJobs((prev) => prev.filter((j) => j.state === "failed"));
    }, 1200);
  }

  /** Uploads one file. Returns a sentence on failure, null on success. */
  async function upload(
    file: File,
    onProgress: (pct: number) => void,
    onSent: () => void,
  ): Promise<string | null> {
    if (!allowed.includes(file.type)) {
      return accept === "both"
        ? "not a JPG, PNG, WebP or MP4"
        : "not a JPG, PNG or WebP";
    }
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

      const uploaded = await send(auth.uploadUrl, body, onProgress);
      if (!uploaded.fileId) throw new Error("Upload finished without a file id.");

      // The bytes are across; what is left is the server reading them back.
      onSent();

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
        kind: VIDEO_TYPES.includes(file.type) ? "VIDEO" : "IMAGE",
        posterUrl: null,
        durationSeconds: null,
        ...preview,
      });
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "upload failed";
    }
  }

  const active = jobs.filter((j) => j.state !== "done");
  const overall = jobs.length
    ? Math.round(jobs.reduce((sum, j) => sum + j.pct, 0) / jobs.length)
    : 0;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={allowed.join(",")}
          multiple={multiple}
          onChange={onPick}
          className="sr-only"
          id={id}
        />
        <label
          htmlFor={id}
          className={cn(
            "inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-sm)] bg-ink px-3.5 text-[13px] font-medium text-white",
            "transition-[background-color,opacity] duration-[var(--dur-base)] hover:bg-ink/90",
            busy && "pointer-events-none opacity-50",
          )}
          aria-disabled={busy}
        >
          {busy ? `Uploading ${overall}%` : label}
        </label>
      </div>

      {/*
        One row per file, with the real byte count behind the bar. A single
        aggregate would hide the one file that is stuck, which on a batch of a
        photo and a video is exactly the one worth seeing.
      */}
      {jobs.length > 0 ? (
        <ul
          aria-live="polite"
          aria-label="Upload progress"
          className="mt-2.5 max-w-sm space-y-1.5"
        >
          {jobs.map((job) => (
            <li key={job.name}>
              <div className="flex items-baseline justify-between gap-3 text-[11.5px]">
                <span className="min-w-0 truncate text-ink-soft">{job.name}</span>
                <span
                  className={cn(
                    "tabular shrink-0",
                    job.state === "failed" ? "text-sale" : "text-ink-muted",
                  )}
                >
                  {job.state === "failed"
                    ? job.problem
                    : job.state === "saving"
                      ? "saving…"
                      : job.state === "done"
                        ? "done"
                        : `${job.pct}%`}
                </span>
              </div>
              {job.state !== "failed" ? (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-200 ease-out",
                      job.state === "done" ? "bg-brand" : "bg-ink",
                    )}
                    style={{ width: `${job.pct}%` }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {active.length === 0 && jobs.some((j) => j.state === "failed") ? (
        <p role="alert" className="sr-only">
          Some files could not be uploaded.
        </p>
      ) : null}
    </div>
  );
}

/**
 * POST a body and report how much of it has gone.
 *
 * The one thing `fetch` cannot do. Resolves with ImageKit's JSON, rejects with
 * ImageKit's own message where there is one — "file size exceeds" is far more
 * use to somebody than "Upload failed (400)".
 */
function send(
  url: string,
  body: FormData,
  onProgress: (pct: number) => void,
): Promise<{ fileId?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.addEventListener("progress", (e) => {
      // `lengthComputable` is false on a body of unknown size; there is nothing
      // honest to show then, so the bar simply stays where it was.
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    });

    xhr.addEventListener("load", () => {
      let payload: { fileId?: string; message?: string } | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as { fileId?: string; message?: string };
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload ?? {});
      } else {
        reject(new Error(payload?.message ?? `Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("The connection dropped before the upload finished.")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

    xhr.send(body);
  });
}

/**
 * A local preview so the newly chosen file appears at once.
 *
 * The blob URL lives only until the page is reloaded, at which point the real
 * ImageKit URL has arrived from the server. Showing nothing for that second
 * reads as a failed upload.
 *
 * Video is measured the same way, from its own metadata — a video element will
 * report `videoWidth` once it has the header, without downloading the file.
 */
async function previewOf(file: File): Promise<{ url: string; width: number; height: number }> {
  const url = URL.createObjectURL(file);

  if (VIDEO_TYPES.includes(file.type)) {
    const size = await new Promise<{ width: number; height: number }>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve({ width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => resolve({ width: 0, height: 0 });
      v.src = url;
    });
    return { url, ...size };
  }

  const size = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
  return { url, ...size };
}
