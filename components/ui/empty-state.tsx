/**
 * Friendly empty state with an inline SVG illustration (no image requests).
 * `variant` picks the drawing; every one uses currentColor + token colours so
 * it follows the theme.
 */
export function EmptyState({
  title,
  description,
  action,
  variant = "questions",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "questions" | "search" | "papers" | "import";
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Illustration variant={variant} />
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function Illustration({ variant }: { variant: "questions" | "search" | "papers" | "import" }) {
  return (
    <svg
      width="112"
      height="84"
      viewBox="0 0 112 84"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="16" y="10" width="80" height="64" rx="10" fill="#F3F1EC" stroke="#E7E4DD" />
      {variant === "search" ? (
        <>
          <circle cx="53" cy="40" r="12" stroke="#9CA3AF" strokeWidth="2" />
          <path d="M62 49l9 9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : variant === "papers" ? (
        <>
          <rect x="34" y="24" width="44" height="10" rx="2" fill="#E7E4DD" />
          <rect x="34" y="40" width="30" height="4" rx="2" fill="#E7E4DD" />
          <rect x="34" y="49" width="36" height="4" rx="2" fill="#E7E4DD" />
          <rect x="34" y="58" width="22" height="4" rx="2" fill="#E7E4DD" />
        </>
      ) : variant === "import" ? (
        <>
          <path
            d="M56 26v22m0 0l-8-8m8 8l8-8"
            stroke="#9CA3AF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="34" y="54" width="44" height="6" rx="3" fill="#E7E4DD" />
        </>
      ) : (
        <>
          <rect x="34" y="24" width="44" height="5" rx="2.5" fill="#E7E4DD" />
          <rect x="34" y="35" width="44" height="5" rx="2.5" fill="#E7E4DD" />
          <rect x="34" y="46" width="30" height="5" rx="2.5" fill="#E7E4DD" />
          <circle cx="82" cy="58" r="7" fill="#EEF1FA" stroke="#DCE3F5" />
          <path d="M82 54.5v7M78.5 58h7" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
