import { QuestionListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function BankLoading() {
  return (
    <div className="grid gap-3 md:grid-cols-[230px_minmax(0,1fr)] min-[1100px]:grid-cols-[230px_minmax(0,1fr)_330px]">
      <div className="pane hidden p-3 md:block">
        <Skeleton className="h-4 w-16" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="pane overflow-hidden">
        <div className="border-b border-line p-3">
          <Skeleton className="h-8 w-full" />
        </div>
        <QuestionListSkeleton rows={8} />
      </div>
      <div className="pane hidden p-3 min-[1100px]:block">
        <Skeleton className="h-4 w-24" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
