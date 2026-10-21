/**
 * Static checks for the source question files.
 *
 *   npm run check-data -- ./data
 *
 * Every `*.json` in the folder is validated (same zod schema as the import)
 * plus the data-quality rules in `lib/import/check.ts`. Exit code 1 when any
 * error is found, so `npm run import` can refuse to write broken data.
 */
import fs from "node:fs";
import path from "node:path";
import { toBanglaDigits } from "@/lib/bangla";
import { checkData } from "@/lib/import/check";

const bn = toBanglaDigits;

export function readSourceFiles(dir: string): {
  files: { name: string; items: unknown[] }[];
  imageFiles: Set<string>;
} {
  const jsonFiles = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();
  const files = jsonFiles.map((name) => ({
    name,
    items: JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as unknown[],
  }));
  const imagesDir = path.join(dir, "images");
  const imageFiles = fs.existsSync(imagesDir)
    ? new Set(fs.readdirSync(imagesDir).filter((f) => !f.startsWith(".")))
    : new Set<string>();
  return { files, imageFiles };
}

/** Print a report and return the exit code (1 when there is any error). */
export function reportChecks(dir: string): number {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`ফোল্ডার পাওয়া যায়নি: ${dir}`);
    return 1;
  }

  const { files, imageFiles } = readSourceFiles(dir);
  if (files.length === 0) {
    console.error(`${dir}-এ কোনো .json ফাইল পাওয়া যায়নি।`);
    return 1;
  }

  const result = checkData(files, { imageFiles });
  const items = files.reduce((sum, f) => sum + f.items.length, 0);

  console.log("");
  console.log(`উৎস ফোল্ডার: ${dir}`);
  console.log(`ফাইল: ${bn(files.length)} · আইটেম: ${bn(items)}`);
  console.log("");

  if (result.errors.length > 0) {
    console.log(`ত্রুটি (${bn(result.errors.length)}):`);
    for (const issue of result.errors) {
      console.log(`  ✗ ${issue.file} → ${issue.id}: ${issue.problem}`);
    }
    console.log("");
  }

  if (result.warnings.length > 0) {
    console.log(`সতর্কতা (${bn(result.warnings.length)}):`);
    for (const issue of result.warnings) {
      console.log(`  ! ${issue.file} → ${issue.id}: ${issue.problem}`);
    }
    console.log("");
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log("কোনো সমস্যা পাওয়া যায়নি।");
    console.log("");
  }

  console.log(
    `ফলাফল: ${bn(result.errors.length)}টি ত্রুটি, ${bn(result.warnings.length)}টি সতর্কতা`,
  );
  return result.errors.length > 0 ? 1 : 0;
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/check-data.ts");
if (invokedDirectly) {
  const dir = path.resolve(process.argv[2] ?? "data");
  process.exitCode = reportChecks(dir);
}
