import crypto from "node:crypto";

/**
 * Short-lived signed token so the headless PDF renderer (which has no session
 * cookie) can open `/print/[id]` for one specific paper.
 */
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  return (
    process.env.PRINT_TOKEN_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    "dev-print-secret-change-me"
  );
}

export function createPrintToken(paperId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${paperId}:${expires}`;
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

export function verifyPrintToken(paperId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const [tokenPaperId, expiresRaw] = payload.split(":");
  if (tokenPaperId !== paperId) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
