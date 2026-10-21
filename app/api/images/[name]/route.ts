import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

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
 * Serves question images in local/demo mode (production uses the public
 * Supabase Storage bucket). Uploads land in ./local-data/images and win over
 * the read-only source folder.
 */
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const safe = path.basename(name);
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
