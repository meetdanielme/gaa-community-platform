/**
 * Applies SQL migrations in ./drizzle to the database at DATABASE_URL
 * (or the local PGlite server started by `pnpm dev` / `pnpm db:server`).
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { LOCAL_DATABASE_URL } from "../src/db/index.ts";

export async function migrateDatabase() {
  const client = postgres(process.env.DATABASE_URL ?? LOCAL_DATABASE_URL, {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDatabase()
    .then(() => console.log("✓ Database migrated"))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
