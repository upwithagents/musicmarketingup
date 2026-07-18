import { mkdir } from "node:fs/promises";
import path from "node:path";

// Uploaded files live outside the repo's tracked tree (data/ is gitignored,
// like the SQLite DB). Tests point UPLOADS_DIR at data/test-uploads.
export function uploadsDir(): string {
  return path.resolve(process.env.UPLOADS_DIR ?? "./data/uploads");
}

export async function ensureUploadsDir(): Promise<string> {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Allowed image types for EPK photos, mapped to their file extension. */
export const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function contentTypeForFilename(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  const entry = Object.entries(IMAGE_EXT_BY_TYPE).find(([, e]) => `.${e}` === ext);
  return entry ? entry[0] : null;
}
