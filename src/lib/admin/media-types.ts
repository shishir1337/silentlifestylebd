/**
 * Shapes for the upload round trip.
 *
 * Separate from `media-actions.ts` because that file is `"use server"`, where
 * every export is a callable endpoint.
 */

/** What the browser needs to upload one file, straight to ImageKit. */
export interface UploadAuth {
  token: string;
  expire: number;
  signature: string;
  /** Safe to expose — it is the public half of the key pair. */
  publicKey: string;
  uploadUrl: string;
  folder: string;
}

export interface RecordUploadInput {
  /** ImageKit's id for the finished upload. Everything else is read back from it. */
  fileId: string;
  alt?: string;
}
