import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database connection (postgres.js + Drizzle).
 *
 * In production DATABASE_URL points at any Postgres (Neon, Supabase, RDS…).
 * In local development `pnpm dev` starts an embedded PGlite server and sets
 * DATABASE_URL for you — see scripts/dev.mts.
 */
export type Database = PostgresJsDatabase<typeof schema>;

export const LOCAL_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54329/postgres";

function createDb(): Database {
  const url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
  // `prepare: false` keeps us compatible with transaction-mode poolers
  // (Neon, Supabase, PgBouncer) and the local PGlite server.
  const client = postgres(url, { prepare: false, max: 5, onnotice: () => {} });
  return drizzle(client, { schema });
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __saintsDb?: Database };

export const db: Database = globalForDb.__saintsDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__saintsDb = db;

export { schema };
