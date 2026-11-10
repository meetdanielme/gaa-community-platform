/**
 * Migrates and (if empty) seeds the database at DATABASE_URL. Used by the
 * Vercel build (`pnpm vercel-build`); locally, `pnpm dev` does this for you.
 */
import "dotenv/config";
import { migrateDatabase } from "./migrate.mts";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Locally, run `pnpm dev` instead.");
  process.exit(1);
}

await migrateDatabase();
console.log("✓ Database migrated");
const { seedDatabase } = await import("./seed.mts");
console.log((await seedDatabase()) ? "✓ Demo data seeded" : "• Existing data kept");
process.exit(0);
