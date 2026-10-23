import Link from "next/link";
import { ArrowRight, FileText, ImageIcon, LibraryBig, PlayCircle, Plus, Upload } from "lucide-react";
import { getStore } from "@/lib/data/store";
import { bankFacets } from "@/lib/bank/filter";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewPaperLink } from "@/components/papers/new-paper-link";
import { subjectById } from "@/lib/subjects";
import { toBanglaDigits } from "@/lib/bangla";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Top shortcuts on the dashboard, styled like the public home cards. */
const QUICK_CARDS = [
  {
    href: "/admin/bank",
    bangla: "প্রশ্নব্যাংক",
    english: "QUESTION BANK",
    description: "প্রশ্ন দেখুন, ফিল্টার করুন ও পেপারে যোগ করুন।",
    icon: LibraryBig,
    accent: "#0f9d8a",
  },
  {
    href: "/admin/videos",
    bangla: "ভিডিও",
    english: "VIDEO",
    description: "YouTube লিংক যোগ করুন ও শিক্ষার্থীদের জন্য প্রকাশ করুন।",
    icon: PlayCircle,
    accent: "#7c3aed",
  },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp["subject"]) ? sp["subject"][0] : sp["subject"];
  const subject = subjectById(raw);
  const store = await getStore();
  const [bank, papers] = await Promise.all([
    store.listQuestions({ subject: subject.id, page: 1, pageSize: 5000 }),
    store.listPapers(),
  ]);
  const facets = bankFacets(bank.items, subject.id);
  const recent = papers.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {QUICK_CARDS.map(({ href, bangla, english, description, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderTopColor: accent, borderTopWidth: 3 }}
          >
            <span
              className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold text-ink">{bangla}</span>
            <span
              className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              {english}
            </span>
            <span className="mt-2 text-sm text-muted">{description}</span>
          </Link>
        ))}
      </div>

      <PageHeader
        title="ড্যাশবোর্ড"
        description="প্রশ্নব্যাংক, পেপার ও ইমপোর্ট — এক জায়গা থেকে।"
        actions={
          <>
            <NewPaperLink className="btn-primary">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> নতুন পেপার
            </NewPaperLink>
            <Link href="/admin/bank" className="btn-secondary">
              প্রশ্নব্যাংক
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="মোট প্রশ্ন"
          value={toBanglaDigits(facets.total)}
          hint={`${toBanglaDigits(facets.chapters.length)}টি অধ্যায়`}
          icon={<LibraryBig className="h-4 w-4" aria-hidden="true" />}
          href={`/admin/bank?subject=${subject.id}`}
        />
        <StatCard
          label="সংরক্ষিত পেপার"
          value={toBanglaDigits(papers.length)}
          hint={papers[0] ? `সর্বশেষ ${formatDate(papers[0].updatedAt)}` : "এখনো নেই"}
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
          href="/admin/papers"
        />
        <StatCard
          label="ছবিসহ প্রশ্ন"
          value={toBanglaDigits(facets.withImage)}
          hint="চিত্রসহ সৃজনশীল"
          icon={<ImageIcon className="h-4 w-4" aria-hidden="true" />}
          href={`/admin/bank?subject=${subject.id}`}
        />
        <StatCard
          label="যাচাই দরকার"
          value={toBanglaDigits(facets.flagged)}
          hint="ফ্ল্যাগ করা প্রশ্ন"
          icon={<Upload className="h-4 w-4" aria-hidden="true" />}
          href={`/admin/bank?subject=${subject.id}&flagged=1`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="pane overflow-hidden">
          <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold">সাম্প্রতিক পেপার</h2>
            <Link
              href="/admin/papers"
              className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              সব দেখুন <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </header>
          {recent.length === 0 ? (
            <EmptyState
              variant="papers"
              title="এখনো কোনো পেপার নেই"
              description="প্রশ্নব্যাংক থেকে প্রশ্ন বেছে প্রথম পেপারটি তৈরি করুন।"
              action={
                <NewPaperLink className="btn-primary">নতুন পেপার</NewPaperLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((paper) => (
                <li key={paper.id}>
                  <Link
                    href={`/admin/papers/${paper.id}/edit`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#faf9f7]"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">
                        {paper.title}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {[paper.className, paper.examName, formatDate(paper.updatedAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted">
                      {toBanglaDigits(paper.questions.length)}টি প্রশ্ন · {toBanglaDigits(paper.totalMarks)}{" "}
                      নম্বর
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="pane p-4">
          <h2 className="text-sm font-semibold">দ্রুত শুরু</h2>
          <p className="mt-1 text-[12px] text-muted">
            {subject.label} বিষয়ের {toBanglaDigits(facets.total)}টি প্রশ্ন প্রস্তুত।
          </p>
          <div className="mt-3 space-y-2">
            <Link href={`/admin/bank?subject=${subject.id}`} className="btn-secondary w-full justify-start">
              <LibraryBig className="h-4 w-4" aria-hidden="true" /> প্রশ্ন বেছে নিন
            </Link>
            <Link href="/admin/questions/new" className="btn-secondary w-full justify-start">
              <Plus className="h-4 w-4" aria-hidden="true" /> নতুন প্রশ্ন লিখুন
            </Link>
            <Link href="/admin/import" className="btn-secondary w-full justify-start">
              <Upload className="h-4 w-4" aria-hidden="true" /> ফাইল থেকে ইমপোর্ট
            </Link>
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">অধ্যায়</p>
            <ul className="mt-1.5 space-y-0.5">
              {facets.chapters.map((chapter) => (
                <li key={chapter.chapter}>
                  <Link
                    href={`/admin/bank?subject=${subject.id}&chapter=${chapter.chapter}`}
                    className="flex items-center gap-2 rounded px-1 py-0.5 text-[12px] text-ink hover:bg-[#faf9f7]"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {subject.chapters[chapter.chapter] ?? `অধ্যায় ${toBanglaDigits(chapter.chapter)}`}
                    </span>
                    <span className="text-muted">{toBanglaDigits(chapter.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="pane group flex items-start gap-3 p-4 transition-colors hover:border-[#d8d4ca]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-medium text-muted">{label}</span>
        <span className="block text-[22px] font-semibold leading-tight text-ink">{value}</span>
        <span className="block truncate text-[11px] text-muted">{hint}</span>
      </span>
      <ArrowRight
        className="ml-auto h-3.5 w-3.5 shrink-0 text-[#c9c4b8] transition-colors group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  );
}
