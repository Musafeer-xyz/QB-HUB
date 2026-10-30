import Link from "next/link";
import { FileText, PlayCircle } from "lucide-react";
import { BrandFooter } from "@/components/brand-footer";
import { BrandHeader } from "@/components/brand-header";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: BRAND_NAME,
};

const CARDS = [
  {
    href: "/exams",
    bangla: "পরীক্ষা",
    english: "EXAM",
    description: "অনলাইন MCQ পরীক্ষা দিন, সাথে সাথে ফলাফল দেখুন।",
    icon: FileText,
    accent: "#0f9d8a",
  },
  {
    href: "/videos",
    bangla: "ভিডিও",
    english: "VIDEO",
    description: "বিষয়ভিত্তিক YouTube ক্লাস দেখুন।",
    icon: PlayCircle,
    accent: "#7c3aed",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F6F5F2]">
      <BrandHeader />
      <main className="container mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="text-center text-2xl font-bold text-ink">স্বাগতম</h1>
        <p className="mt-2 text-center text-sm text-muted">
          পড়াশোনার জন্য পরীক্ষা ও ভিডিও — একটি জায়গায়।
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CARDS.map(({ href, bangla, english, description, icon: Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col rounded-xl border border-line bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderTopColor: accent, borderTopWidth: 3 }}
            >
              <span
                className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${accent}18`, color: accent }}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-bold text-ink">{bangla}</h2>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
                {english}
              </p>
              <p className="mt-3 text-sm text-muted">{description}</p>
            </Link>
          ))}
        </div>

      </main>
      <BrandFooter />
    </div>
  );
}
