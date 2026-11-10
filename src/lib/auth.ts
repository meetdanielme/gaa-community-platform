import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { DEMO_ADMIN, DEMO_MEMBER } from "./demo";
import { db, schema } from "@/db";
import { clubConfig } from "@/club.config";
import { sendEmail } from "@/server/email";

/** Emails that become club admins when they sign up (bootstraps a new club). */
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

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
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Reset your ${clubConfig.name} password`,
        text: `Hi ${user.name},\n\nUse this link to choose a new password (it expires in one hour):\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
      });
    },
  },
  user: {
    deleteUser: { enabled: true },
    additionalFields: {
      phone: { type: "string", required: false },
      eircode: { type: "string", required: false },
      roles: {
        type: "string",
        required: false,
        defaultValue: "family_supporter",
      },
      helpsWith: { type: "string", required: false, input: false },
      // input: false — users can never grant themselves admin rights.
      isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => {
          if (adminEmails.has(data.email.toLowerCase())) {
            return { data: { ...data, isAdmin: true } };
          }
          return { data };
        },
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
  hooks: {
    // The shared demo accounts must keep working for every visitor.
    before: createAuthMiddleware(async (ctx) => {
      if (!clubConfig.demoMode) return;
      if (!["/change-password", "/delete-user", "/request-password-reset", "/change-email"].includes(ctx.path)) return;
      const demoEmails = [DEMO_MEMBER.email, DEMO_ADMIN.email];
      const bodyEmail = (ctx.body as { email?: string } | undefined)?.email;
      const target = (bodyEmail ?? (await getSessionFromCtx(ctx))?.user.email ?? "").toLowerCase();
      if (demoEmails.includes(target)) {
        throw new APIError("FORBIDDEN", { message: "The shared demo accounts can't be changed. Create your own account to try this." });
      }
    }),
  },
  // Must be last: lets server actions set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
