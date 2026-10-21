import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { getStore } from "@/lib/data/store";
import { PaperList } from "@/components/papers/paper-list";
import { PageHeader } from "@/components/ui/page-header";
import { toBanglaDigits } from "@/lib/bangla";

export const dynamic = "force-dynamic";

export default async function PapersPage() {
  const store = await getStore();
  const papers = await store.listPapers();
  return (
    <div className="space-y-3">
      <PageHeader
        icon={FileText}
        title="সংরক্ষিত পেপার"
        description={`${toBanglaDigits(papers.length)}টি পেপার — সম্পাদনা, প্রিন্ট বা PDF ডাউনলোড করুন।`}
        actions={
          <Link href="/admin/papers/new" className="btn-primary">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> নতুন পেপার
          </Link>
        }
      />
      <PaperList papers={papers} />
    </div>
  );
}
