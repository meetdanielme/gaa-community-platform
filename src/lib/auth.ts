import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { clubConfig } from "@/club.config";

/**
 * Hosts this deployment may be served from. Set BETTER_AUTH_URL to pin a
 * single URL; otherwise the URL is derived from the request, limited to
 * localhost, this Vercel deployment's own hosts and AUTH_ALLOWED_HOSTS.
 */
const allowedHosts = [
  "localhost:*",
  "127.0.0.1:*",
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ...(process.env.AUTH_ALLOWED_HOSTS?.split(",") ?? []),
].filter((h): h is string => Boolean(h?.trim()));

export const auth = betterAuth({
  appName: clubConfig.fullName,
  baseURL: process.env.BETTER_AUTH_URL ?? { allowedHosts },
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      eircode: { type: "string", required: false },
      roles: {
        type: "string",
        required: false,
        defaultValue: "family_supporter",
      },
      helpsWith: { type: "string", required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every account gets its own member profile (UC1) and a fee record
        // for the current season (UC5).
        after: async (created) => {
          const [self] = await db
            .insert(schema.member)
            .values({
              managedByUserId: created.id,
              fullName: created.name,
              relationship: "self",
            })
            .returning();
          await db.insert(schema.membershipFee).values({
            memberId: self.id,
            season: clubConfig.season,
            amountCents: clubConfig.membershipFeeCents,
          });
        },
      },
    },
  },
  // Must be last: lets server actions set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
