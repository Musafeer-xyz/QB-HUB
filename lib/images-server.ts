import fs from "node:fs";
import path from "node:path";
import { IMAGE_BUCKET } from "@/lib/images";
import { isLocalMode } from "@/lib/mode";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Which of the given image file names actually exist?
 *
 * Needed on the server so a missing figure renders as a proper placeholder
 * (with the caption) instead of a broken-image icon — client `onError` only
 * runs after hydration, which is too late for the PDF renderer.
 */
export async function availableImageFiles(fileNames: string[]): Promise<Set<string>> {
  const wanted = new Set(fileNames.filter(Boolean));
  if (wanted.size === 0) return wanted;

  if (isLocalMode()) {
    const dirs = [
      path.join(process.cwd(), "local-data", "images"),
      path.join(process.cwd(), "data", "images"),
    ];
    const found = new Set<string>();
    for (const name of wanted) {
      if (dirs.some((dir) => fs.existsSync(path.join(dir, name)))) found.add(name);
    }
    return found;
  }

  const client = (await createSupabaseServerClient()) ?? createSupabaseAdminClient();
  if (!client) return new Set();
  const { data, error } = await client.storage.from(IMAGE_BUCKET).list("", { limit: 1000 });
  if (error || !data) return new Set();
  const existing = new Set(data.map((entry) => entry.name));
  return new Set([...wanted].filter((name) => existing.has(name)));
}
