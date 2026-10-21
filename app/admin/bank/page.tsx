import { getStore } from "@/lib/data/store";
import { BankWorkspace } from "@/components/workspace/bank-workspace";
import { subjectById } from "@/lib/subjects";
import type { QuestionRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 500;
const MAX = 5000;

/**
 * Loads the whole question index for the active subject once, so the workspace
 * can filter and search in memory (no round-trip per keystroke).
 */
async function loadIndex(subject: string): Promise<QuestionRecord[]> {
  const store = await getStore();
  const all: QuestionRecord[] = [];
  for (let page = 1; all.length < MAX; page += 1) {
    const result = await store.listQuestions({ subject, page, pageSize: PAGE });
    all.push(...result.items);
    if (result.items.length === 0 || all.length >= result.total) break;
  }
  return all;
}

export default async function BankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp["subject"]) ? sp["subject"][0] : sp["subject"];
  const subject = subjectById(raw).id;
  const questions = await loadIndex(subject);
  return <BankWorkspace questions={questions} subjectId={subject} />;
}
