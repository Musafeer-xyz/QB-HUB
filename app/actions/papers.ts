"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { paperInputSchema } from "@/lib/schemas/paper";
import { getAuthUser, isAdminUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { computeTotalMarks } from "@/lib/paper/totals";
import type { QuestionRecord } from "@/lib/types";

export type PaperActionResult =
  | { ok: true; id: string; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

async function requireAdmin(): Promise<{ userId: string | null } | { error: string }> {
  if (isLocalMode()) return { userId: null };
  const user = await getAuthUser();
  if (!user) return { error: "লগইন প্রয়োজন।" };
  if (!(await isAdminUser())) return { error: "এই কাজের অনুমতি নেই।" };
  return { userId: user.id };
}

function errorResult(parsed: { error: { flatten: () => { fieldErrors: unknown } } }): PaperActionResult {
  return {
    ok: false,
    message: "ফর্মের তথ্য সঠিক নয়।",
    fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/**
 * Load every referenced question in ONE round of parallel queries. Awaiting
 * them one by one added a network round trip per question to every save.
 */
async function loadQuestionRecords(
  store: Awaited<ReturnType<typeof getStore>>,
  ids: string[],
): Promise<{ records: Map<string, QuestionRecord>; missing: string | null }> {
  const unique = [...new Set(ids)];
  const found = await Promise.all(unique.map((id) => store.getQuestion(id)));
  const records = new Map<string, QuestionRecord>();
  for (let i = 0; i < unique.length; i += 1) {
    const id = unique[i]!;
    const record = found[i];
    if (!record) return { records, missing: id };
    records.set(id, record);
  }
  return { records, missing: null };
}

export async function savePaperAction(input: unknown): Promise<PaperActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, message: auth.error };

  const parsed = paperInputSchema.safeParse(input);
  if (!parsed.success) return errorResult(parsed);

  const values = parsed.data;
  const store = await getStore();

  // Validate every question exists and recompute the total server-side.
  const { records, missing } = await loadQuestionRecords(
    store,
    values.questions.map((pq) => pq.questionId),
  );
  if (missing) {
    return { ok: false, message: `প্রশ্ন “${missing}” পাওয়া যায়নি; তালিকা রিফ্রেশ করুন।` };
  }
  const totalMarks = computeTotalMarks(values.questions, records, values.settings);

  try {
    const paper = await store.createPaper(
      { ...values, totalMarks },
      auth.userId,
    );
    revalidatePath("/admin/papers");
    return { ok: true, id: paper.id, message: `পেপার সংরক্ষিত হয়েছে।` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "সংরক্ষণ ব্যর্থ।" };
  }
}

export async function updatePaperAction(id: string, input: unknown): Promise<PaperActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, message: auth.error };

  const parsed = paperInputSchema.safeParse(input);
  if (!parsed.success) return errorResult(parsed);

  const values = parsed.data;
  const store = await getStore();
  const existing = await store.getPaper(id);
  if (!existing) return { ok: false, message: "পেপার পাওয়া যায়নি।" };

  const { records, missing } = await loadQuestionRecords(
    store,
    values.questions.map((pq) => pq.questionId),
  );
  if (missing) return { ok: false, message: `প্রশ্ন “${missing}” পাওয়া যায়নি।` };
  const totalMarks = computeTotalMarks(values.questions, records, values.settings);

  try {
    await store.updatePaper(id, { ...values, totalMarks });
    revalidatePath("/admin/papers");
    revalidatePath(`/admin/papers/${id}/edit`);
    revalidatePath(`/print/${id}`);
    return { ok: true, id, message: "পেপার হালনাগাদ হয়েছে।" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "হালনাগাদ ব্যর্থ।" };
  }
}

export async function deletePaperAction(id: string): Promise<PaperActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, message: auth.error };
  try {
    const store = await getStore();
    await store.deletePaper(id);
    revalidatePath("/admin/papers");
    return { ok: true, id, message: "পেপার মুছে ফেলা হয়েছে।" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "মুছে ফেলা যায়নি।" };
  }
}

export async function duplicatePaperAction(id: string): Promise<PaperActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, message: auth.error };
  try {
    const store = await getStore();
    const copy = await store.duplicatePaper(id, auth.userId);
    revalidatePath("/admin/papers");
    return { ok: true, id: copy.id, message: "পেপারের কপি তৈরি হয়েছে।" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "কপি করা যায়নি।" };
  }
}

export async function redirectAfterSave(id: string): Promise<void> {
  redirect(`/admin/papers/${id}/edit`);
}
