import { toBanglaDigits } from "@/lib/bangla";

/** `১২ মার্চ ২০২৬` style date for admin lists. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** `১২:৩০ PM` style time. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return toBanglaDigits(
    new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date),
  );
}
