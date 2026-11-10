"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { NEW_PAPER_EVENT, useSelection } from "@/components/selection/selection-context";
import { useAdminSubject } from "@/components/shell/subject-context";
import { resolveAdminSubject, withSubject } from "@/lib/admin-subject";

/**
 * Every “নতুন পেপার” entry point. Unlike a plain link this wipes the saved
 * draft first — selection and section choice — and tells a mounted builder to
 * reset its title/settings, so a new paper never inherits the previous one.
 * The link always carries `?subject=`, so the builder knows its subject before
 * it fetches anything.
 */
export function NewPaperLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selection = useSelection();
  const { subject: pageSubject } = useAdminSubject();
  const subject = resolveAdminSubject({ url: searchParams.get("subject"), paper: pageSubject });
  const href = withSubject("/admin/papers/new", subject);

  function startNewPaper(e: React.MouseEvent<HTMLAnchorElement>) {
    selection.reset();
    window.dispatchEvent(new Event(NEW_PAPER_EVENT));
    // Keep modified clicks (new tab/window) native: the cleared localStorage
    // draft makes the paper opened there empty as well.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.push(href);
  }

  return (
    <Link href={href} className={className} onClick={startNewPaper}>
      {children}
    </Link>
  );
}
