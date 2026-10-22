"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NEW_PAPER_EVENT, useSelection } from "@/components/selection/selection-context";

/**
 * Every “নতুন পেপার” entry point. Unlike a plain link this wipes the saved
 * draft first — selection and section choice — and tells a mounted builder to
 * reset its title/settings, so a new paper never inherits the previous one.
 * Plain navigation tabs/dashboard cards keep using normal links.
 */
export function NewPaperLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const selection = useSelection();

  function startNewPaper(e: React.MouseEvent<HTMLAnchorElement>) {
    selection.reset();
    window.dispatchEvent(new Event(NEW_PAPER_EVENT));
    // Keep modified clicks (new tab/window) native: the cleared localStorage
    // draft makes the paper opened there empty as well.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.push("/admin/papers/new");
  }

  return (
    <Link href="/admin/papers/new" className={className} onClick={startNewPaper}>
      {children}
    </Link>
  );
}
