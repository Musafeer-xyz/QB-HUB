"use client";

import { useEffect } from "react";

/**
 * Opens the browser print dialog for `/print/[id]?print=1` (used by the
 * builder's “দ্রুত প্রিন্ট (ব্রাউজার)” button). It waits for the document to
 * report `data-paper-ready` — fonts loaded, figures decoded, formulas fitted —
 * so the printed paper is identical to the preview and the server PDF.
 */
export function PrintAuto() {
  useEffect(() => {
    let cancelled = false;
    let printed = false;

    const trigger = () => {
      if (cancelled || printed) return;
      const sheet = document.querySelector('[data-paper-ready="1"]');
      if (!sheet) return;
      printed = true;
      observer.disconnect();
      window.setTimeout(() => {
        if (!cancelled) window.print();
      }, 50);
    };

    const observer = new MutationObserver(() => trigger());
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-paper-ready"] });
    trigger();

    // Safety net: never leave the tab silent if hydration fails.
    const timeout = window.setTimeout(() => {
      if (!printed && !cancelled) {
        printed = true;
        window.print();
      }
    }, 8_000);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
