import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "local-data", "images");
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Image upload for the admin question editor.
 * - supabase: writes to the public `question-images` bucket (RLS-protected)
 * - local: writes to ./local-data/images
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ফাইল পাঠান" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "শুধু PNG / JPEG / WebP ছবি আপলোড করা যায়" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ছবির আকার ৮ MB-এর বেশি হতে পারে না" }, { status: 400 });
  }

  const rawName = (form.get("name") as string | null) ?? file.name;
  const ext = path.extname(rawName).toLowerCase() || ".png";
  const base = path.basename(rawName, ext).replace(/[^A-Za-z0-9._-]/g, "");
  const name = `${base || "image"}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isLocalMode()) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, name), bytes);
    return NextResponse.json({ path: name, url: `/api/images/${encodeURIComponent(name)}` });
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase কনফিগার করা নেই" }, { status: 500 });
  }
  const { error } = await client.storage.from("question-images").upload(name, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    return NextResponse.json({ error: `আপলোড ব্যর্থ: ${error.message}` }, { status: 500 });
  }
  const { data } = client.storage.from("question-images").getPublicUrl(name);
  return NextResponse.json({ path: name, url: data.publicUrl });
}
