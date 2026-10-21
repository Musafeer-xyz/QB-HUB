import { Upload } from "lucide-react";
import { ImportPanel } from "@/components/import/import-panel";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        icon={Upload}
        title="ইমপোর্ট"
        description="JSON ফাইল বা পেস্ট করা ডেটা থেকে প্রশ্ন যোগ করুন — আগে যাচাই, তারপর সংরক্ষণ।"
      />
      <ImportPanel />
    </div>
  );
}
