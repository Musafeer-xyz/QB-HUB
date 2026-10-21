"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<{ push: (kind: ToastKind, message: string) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/** Bangla success/error toasts used by the admin UI. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="no-print fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              "rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg " +
              (toast.kind === "error"
                ? "bg-red-600 text-white"
                : toast.kind === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-white")
            }
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
