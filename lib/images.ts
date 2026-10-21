import { isLocalMode, supabasePublicEnv } from "@/lib/mode";

export const IMAGE_BUCKET = "question-images";

/**
 * Public URL for a question image.
 * - local mode: served by /api/images from ./data/images (then ./local-data/images)
 * - supabase: the public `question-images` bucket
 */
export function questionImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  const name = encodeURIComponent(imagePath);
  if (isLocalMode()) return `/api/images/${name}`;
  const env = supabasePublicEnv();
  if (!env) return null;
  return `${env.url}/storage/v1/object/public/${IMAGE_BUCKET}/${name}`;
}
