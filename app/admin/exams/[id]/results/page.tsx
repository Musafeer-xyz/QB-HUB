import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import {
  OLD_ATTEMPTS_DAYS,
  attemptQuestionRows,
  attemptsOlderThanCutoff,
  oldAttemptIds,
} from "@/lib/exams";
import { ExamResults, type AttemptDetails } from "./exam-results";

export const dynamic = "force-dynamic";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) redirect("/admin");
    if (!(await isAdminUser())) redirect("/admin");
  }

  const { id } = await params;
  const store = await getStore();
  const exam = await store.getExam(id);
  if (!exam) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-danger bg-danger/5 p-6">
          <h1 className="text-lg font-semibold text-danger">এক্সাম পাওয়া যায়নি</h1>
          <a href="/admin/exams" className="mt-4 inline-block btn-secondary">
            ফিরে যান
          </a>
        </div>
      </div>
    );
  }

  const attempts = await store.listAttempts(id);

  // Per-question review, built here on the server from the answers stored on
  // each submitted attempt (never in a public route).
  const questions = await store.getExamQuestions(exam.id);
  const details: AttemptDetails = {};
  for (const attempt of attempts) {
    if (!attempt.submittedAt) continue;
    details[attempt.id] = attemptQuestionRows(questions, attempt.answers);
  }

  // Preview for the “পুরনো সব মুছুন” button: how many rows it would remove now.
  const olderCount = oldAttemptIds(attempts, attemptsOlderThanCutoff(OLD_ATTEMPTS_DAYS)).length;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <a href="/admin/exams" className="text-sm text-primary hover:underline">
          ← এক্সাম তালিকায় ফিরে যান
        </a>
        <h1 className="mt-2 text-2xl font-semibold">{exam.title}</h1>
        <p className="text-sm text-muted">
          {attempts.length}টি জমা দেওয়া
        </p>
      </div>
      <ExamResults
        examId={exam.id}
        attempts={attempts}
        details={details}
        olderCount={olderCount}
      />
    </div>
  );
}
