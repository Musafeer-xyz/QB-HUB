import { Suspense } from "react";
import type { Metadata } from "next";
import { SelectionProvider } from "@/components/selection/selection-context";
import { AppHeader } from "@/components/shell/app-header";
import { isLocalMode } from "@/lib/mode";

export const metadata: Metadata = { title: "প্রশ্নব্যাংক — কর্মক্ষেত্র" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SelectionProvider>
      <div className="min-h-screen">
        {/* useSearchParams inside the header needs a Suspense boundary. */}
        <Suspense
          fallback={<div className="h-14 border-b border-line bg-surface" aria-hidden="true" />}
        >
          <AppHeader demo={isLocalMode()} />
        </Suspense>
        <main className="mx-auto max-w-[1440px] px-3 py-4 sm:px-4 sm:py-6">{children}</main>
      </div>
    </SelectionProvider>
  );
}
