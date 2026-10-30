import type { Metadata } from "next";
import Link from "next/link";
import { BrandFooter } from "@/components/brand-footer";
import { BrandHeader } from "@/components/brand-header";
import { getStore } from "@/lib/data/store";
import { BRAND_NAME } from "@/lib/brand";
import { toBanglaDigits } from "@/lib/bangla";
import { cn } from "@/lib/cn";
import {
  examChapterLabel,
  examCount,
  examTabs,
  groupOpenExamsBySection,
  selectedExamTab,
} from "@/lib/exams";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: BRAND_NAME,
};

/**
 * Public exam list. Students have no session and no RLS access to `exams`, so
 * this reads with the service-role store and only ever exposes open exams
 * (title, question count, duration).
 *
 * One subject tab is shown at a time (`?s=`), chosen with plain links so the
 * page stays server-rendered; without a usable parameter the first subject
 * that actually has exams is shown.
 */
export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requested = Array.isArray(sp["s"]) ? sp["s"][0] : sp["s"];

  const store = await getStore({ system: true });
  const sections = groupOpenExamsBySection(await store.listExams());
  const tabs = examTabs(sections);
  const active = selectedExamTab(sections, requested);

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2]">
      <BrandHeader />
      <main className="container mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-center text-2xl font-bold uppercase tracking-[0.2em] text-ink sm:text-3xl">
          ONLINE EXAM
        </h1>

        <nav aria-label="বিষয়" className="-mx-4 mb-6 overflow-x-auto px-4 pb-1">
          <div className="flex w-max gap-2 sm:mx-auto sm:w-auto sm:flex-wrap sm:justify-center">
            {tabs.map((group) => {
              const section = group.section;
              const count = examCount(group);
              const isActive = active?.section.id === section.id;
              const empty = count === 0;
              return (
                <Link
                  key={section.id}
                  href={`/exams?s=${section.id}`}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  data-exam-tab={section.id}
                  data-empty={empty ? "true" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors sm:text-xs",
                    isActive
                      ? "shadow-sm"
                      : empty
                        ? "border-line text-muted hover:border-[#d8d4ca]"
                        : "border-line text-ink hover:border-[#d8d4ca]",
                  )}
                  style={
                    isActive
                      ? {
                          borderColor: section.accent,
                          backgroundColor: `${section.accent}12`,
                          color: section.accent,
                        }
                      : empty
                        ? undefined
                        : { color: section.accent }
                  }
                >
                  <span>{section.english}</span>
                  <span className="text-[11px] font-medium normal-case tracking-normal opacity-75">
                    {section.bangla}
                  </span>
                  <span
                    className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
                    style={{
                      backgroundColor: isActive ? `${section.accent}1f` : "rgba(31,36,48,0.06)",
                    }}
                  >
                    {toBanglaDigits(count)}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {!active || active.chapters.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            শীঘ্রই আসছে
          </p>
        ) : (
          <div className="space-y-6">
            {active.chapters.map(({ chapter, exams }) => (
              <section key={chapter}>
                <h2 className="mb-3 text-base font-semibold text-ink sm:text-lg">
                  {examChapterLabel(exams[0]!.subject, chapter)}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {exams.map((exam) => (
                    <Link
                      key={exam.id}
                      href={`/exam/${exam.id}`}
                      className="group flex flex-col rounded-xl border border-line bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <h3 className="font-semibold text-ink group-hover:underline">{exam.title}</h3>
                      <p className="mt-1.5 whitespace-nowrap text-[13px] text-muted">
                        প্রশ্ন:{" "}
                        <span className="font-medium text-ink">
                          {toBanglaDigits(exam.questionIds.length)} টি
                        </span>
                        <span aria-hidden="true"> · </span>
                        সময়:{" "}
                        <span className="font-medium text-ink">
                          {toBanglaDigits(exam.durationMin)} মিনিট
                        </span>
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <BrandFooter />
    </div>
  );
}
