-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "kind" "AssetKind" NOT NULL DEFAULT 'IMAGE';

-- Correct the mime types that were never really known.
--
-- `recordUpload` used to write a flat 'image/jpeg' for anything ImageKit did
-- not call "non-image", so a PNG and a WebP are both recorded as JPEG today.
-- Nothing reads the column yet, which is exactly why it drifted — but video
-- makes it load-bearing, so bring the existing rows in line with the file
-- extension ImageKit actually stored.
UPDATE "Asset" SET "mimeType" =
  CASE
    WHEN lower("filePath") LIKE '%.png'  THEN 'image/png'
    WHEN lower("filePath") LIKE '%.webp' THEN 'image/webp'
    WHEN lower("filePath") LIKE '%.avif' THEN 'image/avif'
    WHEN lower("filePath") LIKE '%.gif'  THEN 'image/gif'
    WHEN lower("filePath") LIKE '%.svg'  THEN 'image/svg+xml'
    ELSE 'image/jpeg'
  END
WHERE "mimeType" IN ('image/jpeg', 'application/octet-stream');

-- Everything uploaded before this migration is a picture. `kind` defaults to
-- IMAGE, so this is belt and braces for any row written mid-deploy.
UPDATE "Asset" SET "kind" = 'IMAGE' WHERE "kind" IS NULL;
