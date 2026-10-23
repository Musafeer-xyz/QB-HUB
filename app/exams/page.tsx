import type { Metadata } from "next";
import { BrandHeader } from "@/components/brand-header";
import { getStore } from "@/lib/data/store";
import { BRAND_NAME } from "@/lib/brand";
import { toBanglaDigits } from "@/lib/bangla";
import { examChapterLabel, groupOpenExamsBySection } from "@/lib/exams";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: BRAND_NAME,
};

/**
 * Public exam list. Students have no session and no RLS access to `exams`, so
 * this reads with the service-role store and only ever exposes open exams
 * (title, question count, duration).
 *
 * Exams are grouped into the fixed subject sections; a section with no exams
 * still appears with a "coming soon" note, and an unknown stored subject goes
 * to the final section so no exam disappears.
 */
export default async function ExamsPage() {
  const store = await getStore({ system: true });
  const sections = groupOpenExamsBySection(await store.listExams());

  return (
    <div className="min-h-screen bg-[#F6F5F2]">
      <BrandHeader />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-center text-2xl font-bold uppercase tracking-[0.2em] text-ink sm:text-3xl">
          ONLINE EXAM
        </h1>

        <div className="space-y-6">
          {sections.map(({ section, chapters }) => (
            <section
              key={section.id}
              data-exam-section={section.id}
              className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
            >
              <div
                className="flex items-center gap-3 border-b px-4 py-3"
                style={{ borderColor: `${section.accent}33`, backgroundColor: `${section.accent}12` }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: section.accent }}
                  aria-hidden="true"
                />
                <h2
                  className="text-sm font-bold tracking-[0.18em]"
                  style={{ color: section.accent }}
                >
                  {section.english}
                </h2>
                <span className="text-sm text-muted">{section.bangla}</span>
              </div>

              <div className="px-4 py-4">
                {chapters.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
                    শীঘ্রই আসছে
                  </p>
                ) : (
                  <div className="space-y-6">
                    {chapters.map(({ chapter, exams }) => (
                      <div key={chapter}>
                        <h3 className="mb-3 text-lg font-medium">
                          {examChapterLabel(exams[0]!.subject, chapter)}
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
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
