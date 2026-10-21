import type { LucideIcon } from "lucide-react";

/** Consistent page header: icon, title, description, right-aligned actions. */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface text-primary">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-sm text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
