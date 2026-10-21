import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const SHIM = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean not null default false, created_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id) on delete cascade,
  name text, owner uuid, created_at timestamptz default now()
);
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
`;

/** Split SQL on top-level semicolons, ignoring those inside $$...$$ or '...'. */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "$" && sql[i + 1] === "$") {
      const end = sql.indexOf("$$", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      buf += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") break;
        j++;
      }
      const stop = Math.min(j + 1, sql.length);
      buf += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      const stop = nl === -1 ? sql.length : nl + 1;
      buf += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === ";") {
      out.push(buf);
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

async function main(): Promise<void> {
  const db = new PGlite();
  await db.exec(SHIM);
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", "0001_init.sql"), "utf8");
  const statements = splitStatements(sql);
  let n = 0;
  for (const stmt of statements) {
    n++;
    if (!stmt.trim() || stmt.trim().startsWith("--")) {
      // still try if it has non-comment content
      const codeOnly = stmt.replace(/--[^\n]*/g, "").trim();
      if (!codeOnly) continue;
    }
    try {
      await db.exec(stmt);
    } catch (err) {
      console.error(`STATEMENT ${n} FAILED:\n${stmt.slice(0, 400)}\nERROR: ${(err as Error).message}`);
      process.exit(1);
    }
  }
  console.log(`OK — ${statements.length} statements executed`);
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
