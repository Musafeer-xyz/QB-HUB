"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/data/store";
import { getAuthUser, isAdminUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { MAX_ATTEMPT_DELETE, attemptsOlderThanCutoff, oldAttemptIds } from "@/lib/exams";

export type AttemptDeleteResult =
  | { ok: true; deleted: number }
  | { ok: false; message: string };

/** Same gate as the other admin actions; local/demo mode needs no login. */
async function requireAdmin(): Promise<string | null> {
  if (isLocalMode()) return null;
  const user = await getAuthUser();
  if (!user) return "লগইন প্রয়োজন।";
  if (!(await isAdminUser())) return "এই কাজের অনুমতি নেই।";
  return null;
}

function revalidateResults(examId: string): void {
  revalidatePath(`/admin/exams/${examId}/results`);
}

/** Delete the selected attempts of one exam. Ids from other exams are ignored. */
export async function deleteAttempts(examId: string, ids: string[]): Promise<AttemptDeleteResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, message: denied };

  const exam = typeof examId === "string" ? examId.trim() : "";
  if (!exam) return { ok: false, message: "এক্সাম পাওয়া যায়নি।" };

  const unique = Array.isArray(ids)
    ? [...new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
    : [];
  if (unique.length === 0) return { ok: false, message: "কোনো অ্যাটেম্পট নির্বাচন করা হয়নি।" };

  const store = await getStore();
  if (!(await store.getExam(exam))) return { ok: false, message: "এক্সাম পাওয়া যায়নি।" };

  try {
    // Capped per call, and the store scopes the delete to this exam as well.
    const deleted = await store.deleteAttempts(exam, unique.slice(0, MAX_ATTEMPT_DELETE));
    revalidateResults(exam);
    return { ok: true, deleted };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "মুছে ফেলা যায়নি।" };
  }
}

/**
 * Delete every attempt of this exam older than `days`, using the submit time
 * and falling back to the start time for attempts that were never submitted.
 */
export async function deleteOldAttempts(examId: string, days: number): Promise<AttemptDeleteResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, message: denied };

  const exam = typeof examId === "string" ? examId.trim() : "";
  if (!exam) return { ok: false, message: "এক্সাম পাওয়া যায়নি।" };
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return { ok: false, message: "দিন ১ থেকে ৩৬৫ এর মধ্যে পূর্ণসংখ্যা হতে হবে।" };
  }

  const store = await getStore();
  if (!(await store.getExam(exam))) return { ok: false, message: "এক্সাম পাওয়া যায়নি।" };

  try {
    const attempts = await store.listAttempts(exam);
    const ids = oldAttemptIds(attempts, attemptsOlderThanCutoff(days));
    let deleted = 0;
    for (let i = 0; i < ids.length; i += MAX_ATTEMPT_DELETE) {
      deleted += await store.deleteAttempts(exam, ids.slice(i, i + MAX_ATTEMPT_DELETE));
    }
    if (deleted > 0 || ids.length > 0) revalidateResults(exam);
    return { ok: true, deleted };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "মুছে ফেলা যায়নি।" };
  }
}
