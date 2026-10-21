import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocalMode } from "@/lib/mode";

export default function HomePage() {
  if (isLocalMode()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <h1 className="text-2xl font-bold">প্রশ্নব্যাংক — রসায়ন</h1>
        <p className="mt-2 text-slate-600">
          রসায়ন বিষয়ের প্রশ্নব্যাংক থেকে প্রিন্টযোগ্য প্রশ্নপত্র তৈরি করুন। প্রবেশ করতে লগইন করুন।
        </p>
        <Link href="/login" className="btn-primary mt-5 inline-flex">
          লগইন করুন
        </Link>
      </div>
    </main>
  );
}
