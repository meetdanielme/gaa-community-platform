/**
 * Seeds demo content. Safe to run repeatedly: it does nothing if the
 * database already has data, unless you pass --reset.
 *
 *   pnpm db:seed          # seed an empty database
 *   pnpm db:seed --reset  # wipe all data and reseed
 */
import "dotenv/config";
import { seedDatabase } from "../src/server/seed.ts";

seedDatabase({ reset: process.argv.includes("--reset") })
  .then((seeded) => {
    console.log(seeded ? "✓ Demo data seeded" : "• Skipped seeding (database has data, or DEMO_MODE=false)");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
