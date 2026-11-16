"use client";

import { Analytics, type AnalyticsProps } from "@vercel/analytics/next";

const cleanPageView: NonNullable<AnalyticsProps["beforeSend"]> = (event) => {
  const url = new URL(event.url, window.location.origin);
  // Print pages can be opened by the PDF renderer with a signed token.
  if (url.pathname.startsWith("/print/")) return null;
  url.search = "";
  url.hash = "";
  return { ...event, url: url.href };
};

export function SiteAnalytics() {
  return <Analytics beforeSend={cleanPageView} />;
}
