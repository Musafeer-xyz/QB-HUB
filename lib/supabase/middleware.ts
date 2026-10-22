import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "@/lib/mode";

/**
 * Paths the middleware itself redirects to /login when there is no session.
 *
 * `/print/[id]` is deliberately NOT listed: the headless PDF renderer opens it
 * without a session cookie, and that page enforces its own "session OR valid
 * signed print token" rule (see app/print/[id]/page.tsx). Guarding it here
 * would redirect the renderer to /login and produce a PDF of the login screen.
 */
const PROTECTED_PREFIXES = ["/admin", "/setup"];
/**
 * Exam admin routes are NOT listed here: a prefix would also block the public
 * student endpoints (/api/exams/[id]/start, /api/attempts/[id]). They use the
 * route-level `requireAdmin()` guard instead.
 */
const PROTECTED_API = ["/api/pdf", "/api/papers", "/api/questions/admin"];

export function isProtectedPath(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    PROTECTED_API.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

/**
 * Refreshes the Supabase session cookie and redirects anonymous visitors away
 * from admin routes. In local mode (no Supabase configured) nothing is guarded.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = supabasePublicEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not run code between client creation and getUser() — it refreshes cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
