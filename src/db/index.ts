import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

// The hosting platform injects its own DATABASE_URL at process start and does
// not reliably load our .env file, so we keep an explicit Neon connection
// string as a server-side fallback. This value is only ever read by server
// code (API routes) and is never exposed to the browser bundle.
const NEON_DATABASE_URL_FALLBACK =
  "postgresql://neondb_owner:npg_nU4mNTg7tcPE@ep-crimson-poetry-ah9sv7r7-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const rawUrl =
  process.env.NEON_DATABASE_URL ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("neon.tech")
    ? process.env.DATABASE_URL
    : null) ||
  NEON_DATABASE_URL_FALLBACK;

if (!rawUrl) {
  throw new Error("DATABASE_URL (or NEON_DATABASE_URL) is required");
}

/**
 * Build a pg Pool config that works with hosted Postgres providers such as
 * Neon. Some connection-string parameters (e.g. `channel_binding`) are not
 * supported by node-postgres, so we strip them and translate `sslmode` into
 * an explicit `ssl` option.
 */
function buildPoolConfig(url: string): PoolConfig {
  const parsed = new URL(url);
  const sslMode = parsed.searchParams.get("sslmode");
  const needsSsl =
    sslMode === "require" ||
    sslMode === "verify-ca" ||
    sslMode === "verify-full" ||
    parsed.hostname.endsWith("neon.tech");

  // Strip parameters that node-postgres does not understand.
  parsed.searchParams.delete("channel_binding");

  const config: PoolConfig = { connectionString: parsed.toString() };

  if (needsSsl) {
    // Remove sslmode from the connection string to avoid conflicting with the
    // explicit ssl option below.
    parsed.searchParams.delete("sslmode");
    config.connectionString = parsed.toString();
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ?? new Pool(buildPoolConfig(rawUrl));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
