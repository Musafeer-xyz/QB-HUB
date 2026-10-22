import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { IMAGE_BUCKET } from "@/lib/images";
import { isLocalMode, supabasePublicEnv } from "@/lib/mode";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "local-data", "images");
const SOURCE_IMAGE_DIR = path.join(process.cwd(), "data", "images");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Question images behind one same-origin path.
 *
 * - local/demo: files from ./local-data/images then ./data/images (an upload
 *   wins over the read-only source folder);
 * - Supabase: the bytes are proxied from the public `question-images` bucket,
 *   NOT redirected. The headless PDF renderer only allows same-origin
 *   requests, so a cross-origin Storage URL would print a broken figure.
 */
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const safe = path.basename(name);

  const env = isLocalMode() ? null : supabasePublicEnv();
  if (env) {
    const storageUrl = `${env.url}/storage/v1/object/public/${IMAGE_BUCKET}/${encodeURIComponent(safe)}`;
    try {
      const res = await fetch(storageUrl, { cache: "no-store" });
      if (res.ok) {
        return new NextResponse(await res.arrayBuffer(), {
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch {
      // fall through to the local folders / 404
    }
  }

  for (const dir of [LOCAL_UPLOAD_DIR, SOURCE_IMAGE_DIR]) {
    const file = path.join(dir, safe);
    if (!fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file);
    const type = CONTENT_TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" },
    });
  }
  return new NextResponse("ছবি পাওয়া যায়নি", { status: 404 });
}
