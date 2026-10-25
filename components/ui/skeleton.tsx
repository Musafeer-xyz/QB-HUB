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

/** A page header plus a list of rows (papers, exams, results). */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="pane divide-y divide-line overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <span className="sr-only">লোড হচ্ছে…</span>
    </div>
  );
}

/** The paper builder: editor on the left, live preview on the right. */
export function BuilderSkeleton() {
  return (
    <div
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-3">
        <div className="pane space-y-3 p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
        <div className="pane space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
      <div className="pane hidden p-4 lg:block">
        <Skeleton className="mx-auto h-[520px] w-full max-w-[320px]" />
      </div>
      <span className="sr-only">লোড হচ্ছে…</span>
    </div>
  );
}

/** A single form page (new/edit question, new exam, import). */
export function FormSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-3" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="pane space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">লোড হচ্ছে…</span>
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
