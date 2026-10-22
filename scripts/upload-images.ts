/**
 * Upload question figures to the public `question-images` Storage bucket.
 *
 *   npx tsx scripts/upload-images.ts --dry-run                      (list only)
 *   npx tsx scripts/upload-images.ts                                (./data/images)
 *   npx tsx scripts/upload-images.ts ./data/images ./Chemistry/data/images
 *
 * The object key is the bare file name (`chem-06-cq-001.png`), exactly what
 * the importer writes into `questions.image_path` and what the app requests
 * through `/api/images/<name>`. Uploads overwrite (upsert), so re-running is
 * safe. This script never runs as part of the build.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "question-images";
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function filesIn(dir: string): string[] {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith(".") && CONTENT_TYPES[path.extname(f).toLowerCase()])
    .sort();
}

async function main(): Promise<void> {
  loadEnvFiles();
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const dirs = argv.filter((a) => !a.startsWith("--"));
  if (dirs.length === 0) dirs.push(path.join("data", "images"));

  const queue: { dir: string; name: string; bytes: number }[] = [];
  for (const dir of dirs) {
    const resolved = path.resolve(dir);
    if (filesIn(resolved).length === 0) {
      console.error(`কোনো ছবি পাওয়া যায়নি: ${dir}`);
      continue;
    }
    for (const name of filesIn(resolved)) {
      queue.push({ dir: resolved, name, bytes: fs.statSync(path.join(resolved, name)).size });
    }
  }
  if (queue.length === 0) process.exit(1);

  const total = queue.reduce((sum, f) => sum + f.bytes, 0);
  console.log(`ছবি: ${queue.length}টি (${(total / 1024).toFixed(0)} KB) → bucket ${BUCKET}`);
  for (const f of queue) console.log(`  ${f.name} ← ${f.dir}`);

  if (dryRun) {
    console.log("ড্রাই-রান: কিছু আপলোড হয়নি, কোনো ক্রেডেনশিয়াল লাগেনি।");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL (বা SUPABASE_URL) এবং SUPABASE_SERVICE_ROLE_KEY সেট করুন (.env.local)।",
    );
    process.exit(1);
  }

  const client: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let uploaded = 0;
  const failed: string[] = [];
  for (const f of queue) {
    const { error } = await client.storage.from(BUCKET).upload(
      f.name,
      fs.readFileSync(path.join(f.dir, f.name)),
      { contentType: CONTENT_TYPES[path.extname(f.name).toLowerCase()] ?? "application/octet-stream", upsert: true },
    );
    if (error) failed.push(`${f.name} (${error.message})`);
    else uploaded += 1;
  }
  console.log(`আপলোড হয়েছে: ${uploaded}/${queue.length}`);
  if (failed.length > 0) {
    console.error("ব্যর্থ:");
    for (const item of failed) console.error(`  ✗ ${item}`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
