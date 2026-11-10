import { Upload } from "lucide-react";
import { ImportPanel } from "@/components/import/import-panel";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        icon={Upload}
        title="প্রশ্ন ইমপোর্ট"
        description="JSON যোগ করুন, যাচাইয়ের রিপোর্ট দেখুন, তারপর প্রশ্ন সংরক্ষণ করুন।"
      />
      <ImportPanel />
    </div>
  );
}
