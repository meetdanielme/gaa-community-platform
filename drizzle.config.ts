import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Defaults to the local PGlite server (`pnpm dev` or `pnpm db:server`).
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres",
  },
});
