import { Globe } from "lucide-react";
import { BRAND_NAME, SOCIAL_LINKS } from "@/lib/brand";

/** Brand marks are not in this lucide build, so these two are inline SVGs. */
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8L15.2 12Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A21 21 0 0 0 14.25 3.5c-2.45 0-4.05 1.5-4.05 4.25V9.9H7.5V13h2.7v8Z" />
    </svg>
  );
}

/**
 * Footer for every public student screen: the site's own channels plus the
 * copyright line. A link whose URL is empty is skipped, so the set of icons is
 * data, not markup.
 */
export function BrandFooter() {
  const links = [
    { key: "youtube", href: SOCIAL_LINKS.youtube, label: "YouTube", Icon: YouTubeIcon },
    { key: "facebook", href: SOCIAL_LINKS.facebook, label: "Facebook", Icon: FacebookIcon },
    { key: "portfolio", href: SOCIAL_LINKS.portfolio, label: "ওয়েবসাইট", Icon: Globe },
  ].filter((link) => link.href.trim().length > 0);

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-1">
          {links.map(({ key, href, label, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              data-social={key}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#f3f1ec] hover:text-ink"
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </div>
        <p className="text-xs text-muted">© 2026 {BRAND_NAME}</p>
      </div>
    </footer>
  );
}
