import { getStore } from "@/lib/data/store";
import { toBanglaDigits } from "@/lib/bangla";
import { examChapterLabel, groupOpenExams } from "@/lib/exams";

export const dynamic = "force-dynamic";

/**
 * Public exam list. Students have no session and no RLS access to `exams`, so
 * this reads with the service-role store and only ever exposes open exams
 * (title, question count, duration).
 */
export default async function ExamsPage() {
  const store = await getStore({ system: true });
  const groups = groupOpenExams(await store.listExams());

  return (
    <div className="min-h-screen bg-[#F6F5F2]">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-center text-3xl font-bold text-ink">অনলাইন পরীক্ষা</h1>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-8 text-center">
            <p className="text-muted">এখন কোনো খোলা পরীক্ষা নেই।</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.subject}>
                <h2 className="mb-4 text-xl font-semibold capitalize">{group.subject}</h2>
                <div className="space-y-6">
                  {group.chapters.map(({ chapter, exams }) => (
                    <div key={chapter}>
                      <h3 className="mb-3 text-lg font-medium">
                        {examChapterLabel(group.subject, chapter)}
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {exams.map((exam) => (
                          <a
                            key={exam.id}
                            href={`/exam/${exam.id}`}
                            className="block rounded-lg border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
                          >
                            <h4 className="mb-2 font-semibold">{exam.title}</h4>
                            <div className="space-y-1 text-sm text-muted">
                              <p>
                                প্রশ্ন:{" "}
                                <span className="font-medium text-ink">
                                  {toBanglaDigits(exam.questionIds.length)}টি
                                </span>
                              </p>
                              <p>
                                সময়:{" "}
                                <span className="font-medium text-ink">
                                  {toBanglaDigits(exam.durationMin)} মিনিট
                                </span>
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
