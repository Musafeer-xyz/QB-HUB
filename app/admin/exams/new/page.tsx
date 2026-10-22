import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { examChapterLabel, examQuestionProblems, hasProblems } from "@/lib/exams";
import { CreateExamForm } from "./create-exam-form";

export const dynamic = "force-dynamic";

export default async function NewExamPage({
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
  const mcqIdsParam = Array.isArray(sp["mcqIds"]) ? sp["mcqIds"][0] : sp["mcqIds"];
  const subjectParam = Array.isArray(sp["subject"]) ? sp["subject"][0] : sp["subject"];
  const chapterParam = Array.isArray(sp["chapter"]) ? sp["chapter"][0] : sp["chapter"];
  const chapterLabelParam = Array.isArray(sp["chapterLabel"]) ? sp["chapterLabel"][0] : sp["chapterLabel"];

  if (!mcqIdsParam) {
    redirect("/admin/bank");
  }

  const mcqIds = mcqIdsParam.split(",").filter(Boolean);
  const subject: string = subjectParam ?? "chemistry";
  const chapter = chapterParam ? parseInt(chapterParam, 10) : 6;
  const chapterLabel = chapterLabelParam ?? examChapterLabel(subject, chapter);

  // Verify all questions exist and are MCQs with correct_option
  const store = await getStore();
  const questions = await Promise.all(mcqIds.map((id) => store.getQuestion(id)));
  const problems = examQuestionProblems(mcqIds, questions);

  if (hasProblems(problems)) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-danger bg-danger/5 p-6">
          <h1 className="text-lg font-semibold text-danger">ত্রুটি</h1>
          {problems.missing.length > 0 && (
            <p className="mt-2 text-sm">
              এই প্রশ্নগুলো পাওয়া যায়নি: {problems.missing.join(", ")}
            </p>
          )}
          {problems.notMcq.length > 0 && (
            <p className="mt-2 text-sm">
              এই প্রশ্নগুলো MCQ নয়: {problems.notMcq.join(", ")}
            </p>
          )}
          {problems.noAnswer.length > 0 && (
            <p className="mt-2 text-sm">
              এই প্রশ্নগুলোর সঠিক উত্তর নেই: {problems.noAnswer.join(", ")}
            </p>
          )}
          <a href="/admin/bank" className="mt-4 inline-block btn-secondary">
            ফিরে যান
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">নতুন এক্সাম তৈরি করুন</h1>
      <CreateExamForm
        mcqIds={mcqIds}
        subject={subject}
        chapter={chapter}
        chapterLabel={chapterLabel}
        questionCount={mcqIds.length}
      />
    </div>
  );
}
