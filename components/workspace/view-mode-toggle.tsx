"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

type ViewMode = "open" | "compact";

interface ViewModeToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  // Persist view mode to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("qbhub.viewMode", mode);
    } catch {
      // Ignore storage errors
    }
  }, [mode]);

  return (
    <div className="inline-flex rounded-lg border border-line bg-[#f3f1ec] p-1">
      <button
        type="button"
        onClick={() => onModeChange("open")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          mode === "open"
            ? "bg-white text-ink shadow-sm"
            : "text-muted hover:text-ink",
        )}
      >
        খোলা
      </button>
      <button
        type="button"
        onClick={() => onModeChange("compact")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          mode === "compact"
            ? "bg-white text-ink shadow-sm"
            : "text-muted hover:text-ink",
        )}
      >
        সংক্ষিপ্ত
      </button>
    </div>
  );
}
