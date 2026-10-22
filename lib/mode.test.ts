import { afterEach, describe, expect, it } from "vitest";
import { assertRuntimeConfig, getDataMode, missingSupabaseEnv } from "./mode";

const KEYS = [
  "DATA_SOURCE",
  "NODE_ENV",
  "ALLOW_LOCAL_DEMO",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** NODE_ENV is typed read-only; tests need to switch it. */
const env = process.env as Record<string, string | undefined>;
const saved = new Map<string, string | undefined>(KEYS.map((key) => [key, env[key]]));

function setEnv(values: Partial<Record<(typeof KEYS)[number], string | undefined>>): void {
  for (const key of KEYS) {
    const value = values[key];
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

afterEach(() => {
  for (const key of KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
});

describe("data mode guard", () => {
  it("runs local in development with DATA_SOURCE=local", () => {
    setEnv({ DATA_SOURCE: "local", NODE_ENV: "development" });
    expect(getDataMode()).toBe("local");
    expect(() => assertRuntimeConfig()).not.toThrow();
  });

  it("refuses local mode in production without ALLOW_LOCAL_DEMO=1", () => {
    setEnv({ DATA_SOURCE: "local", NODE_ENV: "production" });
    expect(getDataMode()).toBe("supabase");
    expect(() => assertRuntimeConfig()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("allows an explicit production demo with ALLOW_LOCAL_DEMO=1", () => {
    setEnv({ DATA_SOURCE: "local", NODE_ENV: "production", ALLOW_LOCAL_DEMO: "1" });
    expect(getDataMode()).toBe("local");
  });

  it("is Supabase with no DATA_SOURCE, and names every missing value", () => {
    setEnv({ NODE_ENV: "production" });
    expect(getDataMode()).toBe("supabase");
    expect(missingSupabaseEnv()).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
    expect(() => assertRuntimeConfig()).toThrow(/Supabase mode is selected/);
  });

  it("passes the startup check once the Supabase values exist", () => {
    setEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
    });
    expect(missingSupabaseEnv()).toEqual([]);
    expect(() => assertRuntimeConfig()).not.toThrow();
  });
});
