import { redirect } from "next/navigation";
import { getStore, type Store } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { SUBJECTS, subjectById } from "@/lib/subjects";
import { pickExamBankSubject } from "@/lib/exams";
import { ExamList } from "./exam-list";

export const dynamic = "force-dynamic";

/** MCQ totals per registered subject — exams can only be built from MCQs. */
async function mcqCounts(store: Store, subjects: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(
    subjects.map(async (id) => {
      const result = await store.listQuestions({ subject: id, types: ["MCQ"], page: 1, pageSize: 1 });
      return [id, result.total] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) redirect("/admin");
    if (!(await isAdminUser())) redirect("/admin");
  }

  const sp = await searchParams;
  const raw = Array.isArray(sp["subject"]) ? sp["subject"][0] : sp["subject"];
  const activeSubject = subjectById(raw).id;

  const store = await getStore();
  const registered = SUBJECTS.map((s) => s.id);
  const [exams, counts] = await Promise.all([
    store.listExams(),
    mcqCounts(store, registered),
  ]);

  // Exams start in the bank: open it with MCQs only, for a subject that has them.
  const bankSubject = pickExamBankSubject(activeSubject, registered, counts);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">এক্সাম তালিকা</h1>
          <div className="flex items-center gap-2">
            <a href={`/admin/bank?type=MCQ&subject=${bankSubject}`} className="btn-primary">
              নতুন এক্সাম বানান
            </a>
            <a href="/admin/bank" className="btn-secondary">
              ব্যাংকে যান
            </a>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          {"ব্যাংক থেকে MCQ বেছে 'এক্সাম বানাও' চাপুন"}
        </p>
        {bankSubject !== activeSubject ? (
          <p className="mt-0.5 text-sm text-muted">
            {subjectById(activeSubject).label} বিষয়ের MCQ নেই — {subjectById(bankSubject).label}{" "}
            ব্যাংক খুলছে।
          </p>
        ) : null}
      </div>
      <ExamList exams={exams} />
    </div>
  );
}
