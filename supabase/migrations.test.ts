import fs from "node:fs";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

/**
 * Executes the shipped migration SQL against an in-process Postgres
 * (PGlite/WASM) with minimal `auth`/`storage` shims, so the migration is
 * proven to be valid SQL and the triggers/RLS behave as documented.
 */

type Row = Record<string, unknown>;

const db = {
  exec: async (_sql: string): Promise<void> => {},
  query: async (_sql: string, _params?: unknown[]): Promise<{ rows: Row[] }> => ({ rows: [] }),
  close: async (): Promise<void> => {},
};

let realDb: typeof db;

const SHIM_SQL = `
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

const MIGRATION_SQL = fs
  .readFileSync(path.join(__dirname, "migrations", "0001_init.sql"), "utf8")
  // The migration inserts into storage.buckets; PGlite has no storage schema
  // defaults beyond our shim, so the only change needed is nothing at all.
  ;

beforeAll(async () => {
  const mod = await import("@electric-sql/pglite");
  const instance = new mod.PGlite();
  await instance.exec(SHIM_SQL);
  await instance.exec(MIGRATION_SQL);
  realDb = instance as unknown as typeof db;
});

afterAll(async () => {
  await realDb.close();
});

async function rows(sql: string, params?: unknown[]): Promise<Row[]> {
  const res = await realDb.query(sql, params);
  return res.rows;
}

describe("0001_init.sql migration", () => {
  it("creates every table with RLS enabled", async () => {
    const tables = await rows(
      `select tablename, rowsecurity from pg_tables
       where schemaname = 'public'
         and tablename in ('admins','questions','question_parts','papers','paper_questions')
       order by tablename`,
    );
    expect(tables.map((t) => t["tablename"])).toEqual([
      "admins",
      "paper_questions",
      "papers",
      "question_parts",
      "questions",
    ]);
    expect(tables.every((t) => t["rowsecurity"] === true)).toBe(true);
  });

  it("creates the search and filter indexes", async () => {
    const idx = await rows(
      `select indexname from pg_indexes where schemaname = 'public' order by indexname`,
    );
    const names = idx.map((i) => i["indexname"]);
    expect(names).toContain("questions_subject_chapter_type_idx");
    expect(names).toContain("questions_boards_gin_idx");

    // The trigram index only exists where pg_trgm is installable (it is on
    // Supabase; PGlite cannot install it, and the migration degrades gracefully).
    const trgm = await rows(`select 1 from pg_extension where extname = 'pg_trgm'`);
    if (trgm.length > 0) {
      expect(names).toContain("questions_search_trgm_idx");
    } else {
      expect(names).not.toContain("questions_search_trgm_idx");
    }
  });

  it("maintains search_text from question + parts via triggers", async () => {
    await rows(
      `insert into public.questions (id, subject, chapter, type, question, stem)
       values ('test-cq-001', 'chemistry', 6, 'CQ', null, array['উদ্দীপক টেক্সট'])`,
    );
    const afterInsert = await rows(`select search_text from public.questions where id = 'test-cq-001'`);
    expect(String(afterInsert[0]?.["search_text"])).toContain("উদ্দীপক টেক্সট");

    await rows(
      `insert into public.question_parts (question_id, label, marks, text, position)
       values ('test-cq-001', 'ক', 1, 'সুরক্ষিত পার্ট টেক্সট', 0)`,
    );
    const afterParts = await rows(`select search_text from public.questions where id = 'test-cq-001'`);
    expect(String(afterParts[0]?.["search_text"])).toContain("সুরক্ষিত পার্ট টেক্সট");
  });

  it("cascades part deletion when a question is removed", async () => {
    await rows(`delete from public.questions where id = 'test-cq-001'`);
    const parts = await rows(`select 1 from public.question_parts where question_id = 'test-cq-001'`);
    expect(parts).toHaveLength(0);
  });

  it("creates the public question-images bucket", async () => {
    const bucket = await rows(`select id, public from storage.buckets where id = 'question-images'`);
    expect(bucket).toHaveLength(1);
    expect(bucket[0]?.["public"]).toBe(true);
  });

  it("blocks anonymous and non-admin access through RLS", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    await rows(`insert into auth.users (id, email) values ($1, 'teacher@example.com')`, [userId]);

    // No JWT claim at all: nothing may be read or written.
    await realDb.query(`set role authenticated`);
    const anonymousRead = await rows(`select 1 from public.questions`);
    expect(anonymousRead).toEqual([]); // RLS filters every row away
    await expect(
      rows(
        `insert into public.questions (id, subject, chapter, type, question)
         values ('rls-test-1', 'chemistry', 6, 'SQ', 'লেখা যাবে না')`,
      ),
    ).rejects.toThrow(/row-level security/);

    // Signed in, but not an admin yet: still blocked.
    await realDb.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
    const nonAdminRead = await rows(`select 1 from public.questions`);
    expect(nonAdminRead).toEqual([]);
    await expect(
      rows(
        `insert into public.questions (id, subject, chapter, type, question)
         values ('rls-test-1b', 'chemistry', 6, 'SQ', 'এখনো যাবে না')`,
      ),
    ).rejects.toThrow(/row-level security/);

    // Become an admin (the /api/setup route does exactly this with the
    // service-role client), then read/write works.
    await realDb.query(`reset role`);
    await rows(`insert into public.admins (user_id) values ($1)`, [userId]);
    await realDb.query(`set role authenticated`);
    const readable = await rows(`select 1 from public.questions`);
    expect(Array.isArray(readable)).toBe(true);
    const written = await rows(
      `insert into public.questions (id, subject, chapter, type, question)
       values ('rls-test-2', 'chemistry', 6, 'SQ', 'এডমিন লিখতে পারেন') returning id`,
    );
    expect(written[0]?.["id"]).toBe("rls-test-2");

    await realDb.query(`reset role`);
    await rows(`delete from public.questions where id = 'rls-test-2'`);
  });

  it("rejects unknown question types at the database level", async () => {
    await expect(
      rows(
        `insert into public.questions (id, subject, chapter, type, question)
         values ('bad-type', 'chemistry', 6, 'SAQ', 'টাইপ ভুল')`,
      ),
    ).rejects.toThrow();
  });
});
