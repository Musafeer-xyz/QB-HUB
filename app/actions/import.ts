"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/data/store";
import { getAuthUser, isAdminUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { checkData, type CheckIssue } from "@/lib/import/check";
import { buildImportPreview } from "@/lib/import/preview";
import type { ExistingQuestion, ImportAction } from "@/lib/import/plan";

const sourceFilesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(200),
      items: z.array(z.unknown()),
    }),
  )
  .min(1, "কোনো আইটেম পাওয়া যায়নি")
  .max(50, "একবারে সর্বোচ্চ ৫০টি ফাইল");

const importInputSchema = z.object({
  files: sourceFilesSchema,
  /** Image file names already uploaded (so the checker can verify them). */
  images: z.array(z.string()).default([]),
});

export type ImportPreviewEntry = {
  file: string;
  id: string;
  action: ImportAction;
  reason: string | null;
  warnings: string[];
};

export type ImportPreviewResult =
  | {
      ok: true;
      entries: ImportPreviewEntry[];
      totals: {
        items: number;
        insert: number;
        update: number;
        unchanged: number;
        skipped: number;
        warnings: number;
      };
      /** Data-quality errors — present means saving is blocked. */
      issues: CheckIssue[];
    }
  | { ok: false; message: string };

export type ImportCommitResult =
  | { ok: true; inserted: number; updated: number; message: string }
  | { ok: false; message: string };

async function requireAdmin(): Promise<{ userId: string | null } | { error: string }> {
  if (isLocalMode()) return { userId: null };
  const user = await getAuthUser();
  if (!user) return { error: "লগইন প্রয়োজন।" };
  if (!(await isAdminUser())) return { error: "এই কাজের অনুমতি নেই।" };
  return { userId: user.id };
}

async function loadExisting(): Promise<Map<string, ExistingQuestion>> {
  const store = await getStore();
  const result = await store.listQuestions({ subject: "chemistry", page: 1, pageSize: 5000 });
  const map = new Map<string, ExistingQuestion>();
  for (const q of result.items) {
    map.set(q.id, {
      id: q.id,
      subject: q.subject,
      chapter: q.chapter,
      type: q.type,
      stars: q.stars,
      boards: q.boards,
      question: q.question,
      stem: q.stem,
      image_path: q.imagePath,
      image_desc: q.imageDesc,
      flags: q.flags,
      answer: q.answer,
      options: q.options,
      correct_option: q.correctOption,
      parts: q.parts.map((p) => ({
        label: p.label,
        marks: p.marks,
        text: p.text,
        answer: p.answer,
      })),
    });
  }
  return map;
}

/** Validate, diff and report — nothing is written by this action. */
export async function previewImportAction(input: unknown): Promise<ImportPreviewResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, message: auth.error };

  const parsed = importInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues.map((i) => i.message).join("; ") || "ইনপুট সঠিক নয়।",
    };
  }

  const { files, images } = parsed.data;
  const imageFiles = new Set(images);

  try {
    const existing = await loadExisting();
    const preview = buildImportPreview(files, { existing, imageFiles });

    return {
      ok: true,
      entries: preview.entries,
      totals: preview.totals,
      issues: preview.issues,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "যাচাই করা যায়নি।",
    };
  }
}

/**
 * Recompute the plan (never trust the client's copy) and save only the
 * inserted/updated entries. Re-running the same import is a no-op.
 */
export async function commitImportAction(input: unknown): Promise<ImportCommitResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, message: auth.error };

  const parsed = importInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "ইনপুট সঠিক নয়।" };
  }
  const { files, images } = parsed.data;
  const imageFiles = new Set(images);

  try {
    const checked = checkData(files, { imageFiles });
    if (checked.errors.length > 0) {
      return {
        ok: false,
        message: `ডেটা যাচাইয়ে ${checked.errors.length}টি ত্রুটি আছে — আগে ঠিক করুন।`,
      };
    }

    const existing = await loadExisting();
    const preview = buildImportPreview(files, { existing, imageFiles });
    const toWrite = preview.writable;

    if (toWrite.length === 0) {
      return { ok: true, inserted: 0, updated: 0, message: "সব প্রশ্ন আগের মতোই আছে — কিছু লেখা হয়নি।" };
    }

    const store = await getStore();
    const result = await store.importQuestions(toWrite);
    revalidatePath("/admin");
    revalidatePath("/admin/papers");
    return {
      ok: true,
      ...result,
      message: `ইমপোর্ট সম্পন্ন — নতুন ${result.inserted}টি, হালনাগাদ ${result.updated}টি।`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "ইমপোর্ট ব্যর্থ।" };
  }
}
