import { PageSkeleton } from "@/components/ui/skeleton";

export default function ExamsLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <PageSkeleton rows={5} />
    </div>
  );
}
