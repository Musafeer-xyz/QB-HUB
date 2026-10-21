"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Centred dialog used for destructive confirmations. The overlay is the only
 * place a shadow is allowed outside popovers; text and borders stay tokenised.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1f2430]/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} rounded-xl border border-line bg-surface p-5 shadow-dialog`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            className="btn-ghost -mr-1 -mt-1 h-8 w-8 p-0"
            onClick={onClose}
            aria-label="বন্ধ করুন"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
        {children ? <div className="mt-3">{children}</div> : null}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
