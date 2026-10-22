/**
 * Runs once when a Next.js server process starts (Node runtime).
 *
 * The app must never fall back to the local demo bank on a production server
 * just because Supabase env vars are missing: that would publish the demo
 * dataset. `assertRuntimeConfig()` throws here, so the process exits with a
 * readable message instead of starting in a broken state.
 *
 * Builds are exempt: `npm run build` must pass on a machine with no Supabase
 * credentials (CI, a fresh clone).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertRuntimeConfig } = await import("@/lib/mode");
  try {
    assertRuntimeConfig();
  } catch (err) {
    // Next logs (and swallows) instrumentation errors and keeps serving, so
    // exit explicitly: a half-configured server must not answer requests.
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
