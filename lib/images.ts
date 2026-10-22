/** Public Storage bucket created by supabase/migrations/0001_init.sql. */
export const IMAGE_BUCKET = "question-images";

/** Public URL for a question image. Client-safe: no Node imports in this file. */
export function questionImageUrl(filename: string | null): string | null {
  if (!filename) return null;
  return `/api/images/${filename}`;
}