/**
 * `pnpm dev`: starts the local database (unless DATABASE_URL is set),
 * migrates and seeds it, then runs `next dev`.
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { migrateDatabase } from "./migrate.mts";
import { startPgliteServer } from "./pglite-server.mts";

const usingLocalDb = !process.env.DATABASE_URL;
const local = usingLocalDb ? await startPgliteServer() : null;
if (local) console.log("✓ Local database started (.data/pglite)");

await migrateDatabase();
console.log("✓ Database migrated");
const { seedDatabase } = await import("./seed.mts");
console.log((await seedDatabase()) ? "✓ Demo data seeded" : "• Existing data kept");

const next = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

const shutdown = async (code: number) => {
  await local?.stop().catch(() => {});
  process.exit(code);
};
next.on("exit", (code) => shutdown(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => next.kill(signal));
}
