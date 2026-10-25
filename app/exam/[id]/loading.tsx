import { FormSkeleton } from "@/components/ui/skeleton";

export default function ExamLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <FormSkeleton />
    </div>
  );
}
