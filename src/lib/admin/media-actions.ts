"use server";

import { revalidateTag } from "next/cache";
import { ImageKit } from "@imagekit/nodejs";
import { db } from "@/lib/db";
import { assertCatalogAccess } from "@/lib/admin/access";
import { CATALOG_TAG, CATEGORIES_TAG, CONTENT_TAG, PRODUCTS_TAG } from "@/lib/catalog";
import type { SaveResult } from "@/lib/admin/catalog-types";
import type { UploadAuth, RecordUploadInput } from "@/lib/admin/media-types";

/**
 * Media uploads.
 *
 * The file never passes through this server. The browser is given a short-lived
 * signature, uploads straight to ImageKit, and comes back with the result for
 * us to record. Two reasons, and the second is the one that matters:
 *
 *  1. A single VPS should not spend its memory and its request timeout
 *     receiving a 4 MB photo it is only going to forward.
 *  2. The private key stays on the server. The browser gets a signature that is
 *     good for one upload and expires in half an hour — it cannot be replayed
 *     into anything else, and it cannot be turned back into the key.
 */

const UPLOAD_FOLDER = "/catalog";
/**
 * Long enough for a slow phone on 3G to finish, short enough to be useless
 * later. ImageKit refuses anything more than an hour ahead.
 */
const SIGNATURE_TTL = 60 * 30;

function client() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("IMAGEKIT_PRIVATE_KEY is not set — uploads cannot be signed.");
  }
  return new ImageKit({ privateKey });
}

/**
 * Mints one upload signature.
 *
 * Authorised like every other mutation: a signature is permission to put a file
 * in the shop's media library, so it is not something an anonymous request gets
 * to ask for.
 */
export async function createUploadAuth(): Promise<UploadAuth> {
  await assertCatalogAccess();

  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const uploadUrl = "https://upload.imagekit.io/api/v1/files/upload";
  if (!publicKey) {
    throw new Error("NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY is not set.");
  }

  /*
    `expire` is an absolute Unix timestamp, not a duration — whatever the SDK's
    own JSDoc says. It documents the parameter as "expiration time in seconds
    from now" and then assigns it straight through as the timestamp, so passing
    1800 asks ImageKit to accept a signature that expired in January 1970 and
    every upload comes back "invalid expire parameter".

    Which is exactly what happened: the media library filled up from the seed,
    which uploads server-side through a different path, so nothing here was ever
    exercised until somebody tried to add a photograph from the panel.
  */
  const { token, expire, signature } = client().helper.getAuthenticationParameters(
    undefined,
    Math.floor(Date.now() / 1000) + SIGNATURE_TTL,
  );

  return { token, expire, signature, publicKey, uploadUrl, folder: UPLOAD_FOLDER };
}

/**
 * Records a finished upload as an `Asset`.
 *
 * The browser reports what ImageKit told it. That is not taken on trust: the
 * file is read back from ImageKit by its id, and the row is written from *that*
 * — otherwise a crafted request could point an `Asset` at any URL on the
 * internet, and every product page would happily render it.
 */
export async function recordUpload(input: RecordUploadInput): Promise<SaveResult> {
  await assertCatalogAccess();

  const file = await client().files.get(input.fileId);
  if (!file?.fileId || !file.url) {
    return { ok: false, message: "That upload did not complete. Please try again." };
  }
  const fileId = file.fileId;

  /*
    ImageKit calls anything that is not a still "non-image", which lumps video
    in with PDFs and archives. The extension it stored is what separates them,
    so that is what decides — and a file that is neither a known picture nor a
    known video is refused here rather than written as an Asset that nothing on
    the site knows how to render.
  */
  const kind = kindOf(file.filePath ?? file.name ?? "");
  if (!kind) {
    return {
      ok: false,
      message: "That file type cannot be used here. Upload a JPG, PNG, WebP or MP4.",
    };
  }

  /*
    Dimensions are required for a picture and optional for a video.

    `next/image` needs width and height to reserve the box before a byte of
    artwork arrives; without them the layout shift this project spent real
    effort removing comes straight back. A `<video>` reserves its own box from
    its poster frame, and ImageKit does not always report dimensions for one.
  */
  if (kind === "IMAGE" && (!file.width || !file.height)) {
    return { ok: false, message: "That upload did not complete. Please try again." };
  }

  const existing = await db.asset.findFirst({ where: { imagekitFileId: fileId } });
  if (existing) return { ok: true, id: existing.id };

  /**
   * A blur placeholder, fetched as a 16px version of the file just stored.
   *
   * `next/image` needs one for `placeholder="blur"`, and static imports used to
   * supply it for free. Without it the blur-up is lost — and with it, the
   * layout shift it was hiding comes back.
   */
  let blurDataURL: string | null = null;
  if (kind === "IMAGE") {
    try {
      const res = await fetch(`${file.url}?tr=w-16,bl-6,q-40,f-jpg`);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        // Anything above a couple of KB is not a placeholder, it is a second image.
        if (buf.byteLength <= 4096) {
          blurDataURL = `data:image/jpeg;base64,${buf.toString("base64")}`;
        }
      }
    } catch {
      // A missing placeholder is a smaller problem than a failed upload.
    }
  }

  const asset = await db.asset.create({
    data: {
      imagekitFileId: fileId,
      url: file.url,
      filePath: file.filePath ?? `${UPLOAD_FOLDER}/${file.name}`,
      kind,
      /*
        Zero for a video whose dimensions ImageKit did not report. The gallery
        reads `kind` before it reads either number, so a zero never reaches a
        layout calculation — but a null would force every consumer of the
        column to handle it, for a case only video has.
      */
      width: file.width ?? 0,
      height: file.height ?? 0,
      durationSeconds:
        kind === "VIDEO" && typeof file.duration === "number"
          ? Math.round(file.duration)
          : null,
      blurDataURL,
      alt: input.alt?.trim() || null,
      bytes: file.size ?? 0,
      // The real type, from the name ImageKit stored. This used to be a flat
      // "image/jpeg" for everything it did not call "non-image".
      mimeType: mimeOf(file.filePath ?? file.name ?? ""),
    },
  });

  revalidateTag(CATALOG_TAG, "max");
  revalidateTag(PRODUCTS_TAG, "max");
  revalidateTag(CATEGORIES_TAG, "max");
  revalidateTag(CONTENT_TAG, "max");

  return { ok: true, id: asset.id };
}

/**
 * Deletes an image, from the database and from ImageKit.
 *
 * Refused while anything still points at it. The schema would refuse too — the
 * relations are `Restrict` — but a foreign-key error is not a sentence to show
 * somebody trying to tidy up their photos.
 */
export async function deleteAsset(id: string): Promise<SaveResult> {
  await assertCatalogAccess();

  const asset = await db.asset.findUnique({
    where: { id },
    select: {
      imagekitFileId: true,
      _count: {
        select: {
          categories: true,
          productImages: true,
          heroDesktop: true,
          heroMobile: true,
          promoTiles: true,
        },
      },
    },
  });
  if (!asset) return { ok: false, message: "That image is already gone." };

  const uses = Object.values(asset._count).reduce((n, c) => n + c, 0);
  if (uses > 0) {
    return {
      ok: false,
      message: `This image is used in ${uses} ${uses === 1 ? "place" : "places"}. Replace it there first, then delete it.`,
    };
  }

  // Database first. If ImageKit fails afterwards the worst case is an orphan
  // file in the media library; doing it the other way round leaves a row
  // pointing at a URL that 404s on a live product page.
  await db.asset.delete({ where: { id } });
  try {
    await client().files.delete(asset.imagekitFileId);
  } catch (error) {
    console.error("[media] ImageKit delete failed, row already removed:", error);
  }

  revalidateTag(CATALOG_TAG, "max");
  revalidateTag(CONTENT_TAG, "max");
  return { ok: true };
}

/* --- what kind of file is this ------------------------------------------- */

/**
 * One table, read by both helpers below.
 *
 * Keyed on the extension ImageKit stored rather than on the browser's reported
 * MIME type: the browser's is a claim made by the client, and ImageKit's own
 * `fileType` only distinguishes "image" from "non-image", which puts an MP4 in
 * the same bucket as a PDF.
 */
const BY_EXTENSION: Record<string, { kind: "IMAGE" | "VIDEO"; mime: string }> = {
  jpg: { kind: "IMAGE", mime: "image/jpeg" },
  jpeg: { kind: "IMAGE", mime: "image/jpeg" },
  png: { kind: "IMAGE", mime: "image/png" },
  webp: { kind: "IMAGE", mime: "image/webp" },
  avif: { kind: "IMAGE", mime: "image/avif" },
  gif: { kind: "IMAGE", mime: "image/gif" },
  mp4: { kind: "VIDEO", mime: "video/mp4" },
  webm: { kind: "VIDEO", mime: "video/webm" },
  mov: { kind: "VIDEO", mime: "video/quicktime" },
  m4v: { kind: "VIDEO", mime: "video/mp4" },
};

function extensionOf(path: string): string {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Null for anything this shop has no way to display. */
function kindOf(path: string): "IMAGE" | "VIDEO" | null {
  return BY_EXTENSION[extensionOf(path)]?.kind ?? null;
}

function mimeOf(path: string): string {
  return BY_EXTENSION[extensionOf(path)]?.mime ?? "application/octet-stream";
}
