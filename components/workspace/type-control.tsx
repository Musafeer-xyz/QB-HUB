"use client";

import { useState, useEffect } from "react";
import { toBanglaDigits } from "@/lib/bangla";
import { cn } from "@/lib/cn";

interface TypeControlProps {
  facets: {
    total: number;
    sq: number;
    cq: number;
    mcq: number;
  };
  selectedType: "all" | "SQ" | "CQ" | "MCQ";
  onTypeChange: (type: "all" | "SQ" | "CQ" | "MCQ") => void;
  onTypeLockChange?: (locked: boolean) => void;
  typeLocked?: boolean;
}

export function TypeControl({ facets, selectedType, onTypeChange, onTypeLockChange, typeLocked = true }: TypeControlProps) {
  const [typeLock, setTypeLock] = useState(typeLocked);

  // Persist type lock to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qbhub.typeLock");
      if (saved !== null) {
        setTypeLock(saved === "true");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleTypeLockChange = (locked: boolean) => {
    setTypeLock(locked);
    onTypeLockChange?.(locked);
    try {
      localStorage.setItem("qbhub.typeLock", String(locked));
    } catch {
      // Ignore storage errors
    }
  };

  const types = [
    { key: "all" as const, label: "সব", count: facets.total },
    { key: "SQ" as const, label: "সংক্ষিপ্ত", count: facets.sq },
    { key: "CQ" as const, label: "সৃজনশীল", count: facets.cq },
  ];

  if (facets.mcq > 0) {
    types.push({ key: "MCQ" as const, label: "বহুনির্বাচনী", count: facets.mcq });
  }

  return (
    <div className="flex items-center gap-3">
      {/* Segmented control */}
      <div className="inline-flex rounded-lg border border-line bg-[#f3f1ec] p-1">
        {types.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => onTypeChange(type.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              selectedType === type.key
                ? "bg-white text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {type.label}
            <span className="ml-1 text-xs opacity-75">
              ({toBanglaDigits(type.count)})
            </span>
          </button>
        ))}
      </div>

      {/* Type lock toggle */}
      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--primary)]"
          checked={typeLock}
          onChange={(e) => handleTypeLockChange(e.target.checked)}
        />
        টাইপ লক
      </label>
    </div>
  );
}
