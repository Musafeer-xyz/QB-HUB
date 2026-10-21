import type { Metadata } from "next";
import { Noto_Sans_Bengali, Noto_Serif_Bengali } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  // Local/system fallbacks so text still renders if the font fails to load.
  fallback: ["Noto Sans Bengali", "Nirmala UI", "Vrinda", "Arial Unicode MS", "sans-serif"],
  variable: "--font-bangla",
});

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  fallback: ["Noto Serif Bengali", "Bangla", "Kalpurush", "sans-serif"],
  variable: "--font-bangla-serif",
});

export const metadata: Metadata = {
  title: "প্রশ্নব্যাংক — রসায়ন",
  description: "রসায়ন বিষয়ের প্রশ্নব্যাংক থেকে প্রিন্টযোগ্য প্রশ্নপত্র তৈরি করুন।",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${notoSansBengali.variable} ${notoSerifBengali.variable}`}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
