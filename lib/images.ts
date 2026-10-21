export const IMAGE_BUCKET = "qb-images";

/** Public URL for a question image. Client-safe: no Node imports in this file. */
export function questionImageUrl(filename: string | null): string | null {
  if (!filename) return null;
  return `/api/images/${filename}`;
}