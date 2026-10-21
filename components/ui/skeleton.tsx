/** Neutral loading placeholders (see `.skeleton` in globals.css). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function QuestionListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="প্রশ্ন লোড হচ্ছে">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-2 p-3 ${className}`} aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
