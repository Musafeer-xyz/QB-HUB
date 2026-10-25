"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The subject the current admin page is working on, when the page knows better
 * than its URL does (a paper's own subject, or a new paper's selected
 * questions). Keyed by pathname so it never leaks to another page.
 */
type SubjectState = {
  /** Subject this page reports, or null when it reports none. */
  subject: string | null;
  /** Report the page's subject (idempotent). */
  setSubject: (subject: string) => void;
};

const SubjectContext = createContext<SubjectState>({ subject: null, setSubject: () => {} });

export function useAdminSubject(): SubjectState {
  return useContext(SubjectContext);
}

export function AdminSubjectProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [override, setOverride] = useState<{ path: string; subject: string } | null>(null);

  const setSubject = useCallback(
    (subject: string) => {
      setOverride((prev) =>
        prev && prev.path === pathname && prev.subject === subject ? prev : { path: pathname, subject },
      );
    },
    [pathname],
  );

  const value = useMemo<SubjectState>(
    () => ({ subject: override && override.path === pathname ? override.subject : null, setSubject }),
    [override, pathname, setSubject],
  );

  return <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>;
}
