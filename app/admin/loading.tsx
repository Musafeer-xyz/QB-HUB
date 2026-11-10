export default function AdminLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]" aria-busy="true">
      <p className="col-span-full text-sm text-muted" role="status">কর্মক্ষেত্র লোড হচ্ছে…</p>
      <div className="hidden h-fit motion-safe:animate-pulse rounded-xl border border-line bg-surface p-4 lg:block" aria-hidden="true">
        <div className="mb-4 h-8 rounded bg-slate-100" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="mb-2 h-5 rounded bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="motion-safe:animate-pulse rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 h-4 w-1/3 rounded bg-slate-100" />
            <div className="mb-2 h-4 w-full rounded bg-slate-100" />
            <div className="mb-2 h-4 w-5/6 rounded bg-slate-100" />
            <div className="mb-4 h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-9 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
