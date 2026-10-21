/**
 * Import question JSON files + images into Supabase.
 *
 *   npm run import -- ./data
 *   npm run import -- ./data --dry-run        (validate + plan only, no writes)
 *   npm run import -- ./data --no-images      (skip Storage uploads)
 *
 * Reads every `*.json` inside the given directory plus `./images` for figures.
 * Upserts by `id`, so re-running is always safe: unchanged items are skipped.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { planImport, type DbQuestion, type ExistingQuestion, type ImportPlan } from "@/lib/import/plan";
import { checkData } from "@/lib/import/check";

// ---------------------------------------------------------------------------
// Tiny .env loader (so `npm run import` works without extra tooling)
// ---------------------------------------------------------------------------
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
loadEnvFiles();

type Args = { dir: string; dryRun: boolean; uploadImages: boolean };

function parseArgs(argv: string[]): Args {
  const positional = argv.filter((a) => !a.startsWith("--"));
  return {
    dir: positional[0] ?? "data",
    dryRun: argv.includes("--dry-run"),
    uploadImages: !argv.includes("--no-images"),
  };
}

function toBangla(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

async function fetchExisting(client: SupabaseClient): Promise<Map<string, ExistingQuestion>> {
  const map = new Map<string, ExistingQuestion>();
  const { data: questions, error } = await client.from("questions").select("*");
  if (error) throw new Error(`প্রশ্ন পড়া যায়নি: ${error.message}`);
  for (const q of questions ?? []) {
    map.set(q.id as string, {
      id: q.id as string,
      subject: q.subject as string,
      chapter: q.chapter as number,
      type: q.type as string,
      stars: q.stars as number | null,
      boards: (q.boards as string[]) ?? [],
      question: q.question as string | null,
      stem: (q.stem as string[]) ?? [],
      image_path: q.image_path as string | null,
      image_desc: q.image_desc as string | null,
      flags: q.flags,
      answer: q.answer as string | null,
      options: (q.options as string[] | null) ?? null,
      correct_option: q.correct_option as string | null,
      parts: [],
    });
  }
  const { data: parts, error: partsError } = await client
    .from("question_parts")
    .select("question_id, label, marks, text, answer, position")
    .order("position", { ascending: true });
  if (partsError) throw new Error(`পার্ট পড়া যায়নি: ${partsError.message}`);
  for (const p of parts ?? []) {
    const owner = map.get(p.question_id as string);
    owner?.parts.push({
      label: p.label as string,
      marks: p.marks as number,
      text: p.text as string,
      answer: (p.answer as string | null) ?? null,
    });
  }
  return map;
}

async function upsertQuestion(client: SupabaseClient, q: DbQuestion): Promise<void> {
  const row = {
    id: q.id,
    subject: q.subject,
    chapter: q.chapter,
    type: q.type,
    stars: q.stars,
    boards: q.boards,
    question: q.question,
    stem: q.stem,
    image_path: q.image_path,
    image_desc: q.image_desc,
    flags: q.flags,
    answer: q.answer,
    options: q.options,
    correct_option: q.correct_option,
  };
  const { error } = await client.from("questions").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`“${q.id}” সংরক্ষণ ব্যর্থ: ${error.message}`);

  if (q.type === "CQ") {
    const { error: delError } = await client.from("question_parts").delete().eq("question_id", q.id);
    if (delError) throw new Error(`“${q.id}” পার্ট মুছে ফেলা যায়নি: ${delError.message}`);
    if (q.parts.length > 0) {
      const payload = q.parts.map((p) => ({
        question_id: q.id,
        label: p.label,
        marks: p.marks,
        text: p.text,
        answer: p.answer,
        position: p.position,
      }));
      const { error: insertError } = await client.from("question_parts").insert(payload);
      if (insertError) throw new Error(`“${q.id}” পার্ট সংরক্ষণ ব্যর্থ: ${insertError.message}`);
    }
  }
}

function printReport(plan: ImportPlan, dir: string, skippedImages: string[]): void {
  const t = plan.totals;
  console.log("");
  console.log(`উৎস ফোল্ডার: ${dir}`);
  console.log(`মোট আইটেম: ${toBangla(t.items)}`);
  console.log("");
  console.log("কার্যক্রম");
  console.log(`  নতুন যুক্ত (inserted)      : ${toBangla(t.insert)}`);
  console.log(`  হালনাগাদ (updated)         : ${toBangla(t.update)}`);
  console.log(`  অপরিবর্তিত (skipped)       : ${toBangla(t.unchanged)}`);
  console.log(`  বাতিল — কারণসহ (skipped)   : ${toBangla(t.skipped)}`);
  console.log(`  সতর্কতা (warnings)         : ${toBangla(t.warnings)}`);
  console.log("");

  const skipped = plan.entries.filter((e) => e.action === "skipped");
  if (skipped.length > 0) {
    console.log("বাতিল আইটেমের কারণ:");
    for (const e of skipped) {
      console.log(`  ✗ ${e.file} → ${e.id}: ${e.reason}`);
    }
    console.log("");
  }

  const warned = plan.entries.filter((e) => e.warnings.length > 0);
  if (warned.length > 0) {
    console.log("সতর্কতা:");
    for (const e of warned.slice(0, 40)) {
      for (const w of e.warnings) console.log(`  ! ${e.id}: ${w}`);
    }
    if (warned.length > 40) console.log(`  … আরও ${toBangla(warned.length - 40)}টি`);
    console.log("");
  }

  if (skippedImages.length > 0) {
    console.log(`ছবি আপলোড করা হয়নি (ফাইল নেই): ${skippedImages.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dir = path.resolve(args.dir);

  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`ফোল্ডার পাওয়া যায়নি: ${dir}`);
    process.exit(1);
  }

  const jsonFiles = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();
  if (jsonFiles.length === 0) {
    console.error(`${dir}-এ কোনো .json ফাইল পাওয়া যায়নি।`);
    process.exit(1);
  }

  const files = jsonFiles.map((name) => ({
    name,
    items: JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as unknown[],
  }));

  const imagesDir = path.join(dir, "images");
  const imageFiles = fs.existsSync(imagesDir)
    ? new Set(fs.readdirSync(imagesDir).filter((f) => !f.startsWith(".")))
    : new Set<string>();

  // Data-quality gate: never write broken source data, even on --dry-run.
  const checked = checkData(files, { imageFiles });
  if (checked.errors.length > 0) {
    console.error("ডেটা যাচাইয়ে ত্রুটি পাওয়া গেছে — কিছুই লেখা হয়নি:");
    for (const issue of checked.errors) {
      console.error(`  ✗ ${issue.file} → ${issue.id}: ${issue.problem}`);
    }
    console.error(`মোট ${toBangla(checked.errors.length)}টি ত্রুটি।`);
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  let existing = new Map<string, ExistingQuestion>();
  let client: SupabaseClient | null = null;

  if (!args.dryRun) {
    if (!supabaseUrl || !serviceKey) {
      console.error(
        "SUPABASE_URL এবং SUPABASE_SERVICE_ROLE_KEY সেট করুন (.env.local)।\n" +
          "শুধু যাচাই করতে চাইলে: npm run import -- ./data --dry-run",
      );
      process.exit(1);
    }
    client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    existing = await fetchExisting(client);
  }

  const plan = planImport(files, { existing, imageFiles });

  if (args.dryRun) {
    printReport(plan, args.dir, []);
    console.log("ড্রাই-রান: কিছু লেখা হয়নি (শুধু যাচাই ও পরিকল্পনা)।");
    process.exit(plan.totals.skipped > 0 ? 1 : 0);
  }

  if (!client) throw new Error("client missing");

  const skippedImages: string[] = [];
  for (const entry of plan.entries) {
    if (entry.action === "skipped" || !entry.question) continue;
    if (entry.action === "unchanged") continue;
    await upsertQuestion(client, entry.question);
  }

  // Upload images (idempotent overwrite) for every referenced figure.
  if (args.uploadImages) {
    for (const entry of plan.entries) {
      if (!entry.image || !entry.image.present || !entry.question) continue;
      const filePath = path.join(imagesDir, entry.image.file);
      const bytes = fs.readFileSync(filePath);
      const contentType = entry.image.file.toLowerCase().endsWith(".png")
        ? "image/png"
        : entry.image.file.toLowerCase().endsWith(".jpg") ||
            entry.image.file.toLowerCase().endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";
      const { error } = await client.storage
        .from("question-images")
        .upload(entry.image.file, bytes, { contentType, upsert: true });
      if (error) skippedImages.push(`${entry.image.file} (${error.message})`);
    }
  } else {
    for (const entry of plan.entries) {
      if (entry.image && !entry.image.present) skippedImages.push(entry.image.file);
    }
  }

  printReport(plan, args.dir, skippedImages);
  if (plan.totals.skipped > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
