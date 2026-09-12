import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { ImageKit } from "@imagekit/nodejs";
import type { PrismaClient } from "@prisma/client";

/**
 * Uploads the local catalogue imagery to ImageKit and records each file as an
 * `Asset` row.
 *
 * Idempotent by design: an `Asset` is matched on its ImageKit file path, so
 * re-running the seed re-uses what is already uploaded instead of filling the
 * media library with duplicates. Deleting a row and re-running re-uploads only
 * that one file.
 *
 * Returns a map of local filename -> Asset id, which the catalogue and content
 * seeds use to attach images without knowing anything about ImageKit.
 */

/**
 * Source directories, relative to the repo root, and where each lands in the
 * ImageKit media library.
 *
 * Deliberately not nested under an extra "silentlifestylebd" folder — the URL
 * endpoint already carries the account name, so doing that produced
 * `ik.imagekit.io/silentlifestylebd/silentlifestylebd/hero/...` and gave the
 * client a redundant folder to click through in their media library.
 */
const SOURCES = [
  { dir: "src/assets/catalog", folder: "/catalog" },
  { dir: "src/assets/hero", folder: "/hero" },
];

export type AssetMap = Map<string, string>;

function imagekitClient() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "IMAGEKIT_PRIVATE_KEY is not set. Copy .env.example to .env and fill it in.",
    );
  }
  return new ImageKit({ privateKey });
}

/**
 * A tiny blurred JPEG, inlined as a data URL.
 *
 * next/image needs this for `placeholder="blur"`. Static imports get it from
 * the build; database-backed images have to bring their own or the blur-up
 * effect — and the reason it exists, which is hiding image pop-in — is lost.
 *
 * Rather than adding an image-processing dependency, we ask ImageKit for a
 * 16px blurred version of the file it just stored and inline the bytes. The
 * result is ~400 bytes, the same order as Next's own placeholders.
 */
async function buildBlurDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${url}?tr=w-16,bl-6,q-40,f-jpg`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // A placeholder larger than a couple of KB is a bug, not a placeholder.
    if (buf.byteLength > 4096) return null;
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function seedAssets(db: PrismaClient): Promise<AssetMap> {
  const client = imagekitClient();
  const map: AssetMap = new Map();

  for (const source of SOURCES) {
    let files: string[];
    try {
      files = (await readdir(source.dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    } catch {
      console.log(`  ${source.dir} not found, skipping`);
      continue;
    }

    for (const fileName of files.sort()) {
      const localPath = path.join(source.dir, fileName);
      const filePath = `${source.folder}/${fileName}`;

      const existing = await db.asset.findFirst({ where: { filePath } });
      if (existing) {
        map.set(fileName, existing.id);
        console.log(`  = ${fileName} (already uploaded)`);
        continue;
      }

      const uploaded = await client.files.upload({
        file: createReadStream(localPath),
        fileName,
        folder: source.folder,
        // Keep the filename stable so `filePath` is a reliable identity, and
        // so re-running after a wipe overwrites rather than accumulating.
        useUniqueFileName: false,
        overwriteFile: true,
      });

      if (!uploaded.fileId || !uploaded.url || !uploaded.width || !uploaded.height) {
        throw new Error(
          `ImageKit returned an incomplete response for ${fileName}: ` +
            JSON.stringify(uploaded),
        );
      }

      const blurDataURL = await buildBlurDataURL(uploaded.url);
      const bytes = uploaded.size ?? (await stat(localPath)).size;

      const asset = await db.asset.create({
        data: {
          imagekitFileId: uploaded.fileId,
          url: uploaded.url,
          filePath: uploaded.filePath ?? filePath,
          width: uploaded.width,
          height: uploaded.height,
          blurDataURL,
          bytes,
          mimeType: uploaded.fileType === "non-image" ? "application/octet-stream" : "image/jpeg",
        },
      });

      map.set(fileName, asset.id);
      console.log(
        `  + ${fileName}  ${uploaded.width}x${uploaded.height}  ${Math.round(bytes / 1024)}KB` +
          `${blurDataURL ? "" : "  (no blur placeholder)"}`,
      );
    }
  }

  return map;
}

/** Throws a readable error rather than a null-reference deep in the seed. */
export function assetId(map: AssetMap, fileName: string): string {
  const id = map.get(fileName);
  if (!id) {
    throw new Error(
      `No uploaded asset named "${fileName}". Is it in src/assets/catalog or src/assets/hero?`,
    );
  }
  return id;
}
