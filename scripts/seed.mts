/**
 * Seeds demo content. Safe to run repeatedly: it does nothing if the
 * database already has goals, unless you pass --reset.
 *
 *   pnpm db:seed          # seed an empty database
 *   pnpm db:seed --reset  # wipe all data and reseed
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { clubConfig } from "../src/club.config.ts";
import { db } from "../src/db/index.ts";
import * as s from "../src/db/schema.ts";
import * as data from "./seed-data.mts";

async function reset() {
  await db.execute(sql`
    truncate table vote, voting_round, donation, goal, volunteer_assignment,
      volunteer_role, event_reminder, event_response, event, post_like, post,
      membership_fee, member, session, account, verification, "user" cascade
  `);
}

async function createUser(input: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  eircode?: string;
  roles: string;
  helpsWith?: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(s.user).values({
    id,
    name: input.name,
    email: input.email,
    emailVerified: true,
    phone: input.phone,
    eircode: input.eircode,
    roles: input.roles,
    helpsWith: input.helpsWith,
  });
  if (input.password) {
    await db.insert(s.account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(input.password),
    });
  }
  return id;
}

async function seed() {
  // --- Demo family --------------------------------------------------------
  const evanId = await createUser({ ...data.demoUser, password: data.DEMO_PASSWORD });
  const [evanSelf] = await db
    .insert(s.member)
    .values({ managedByUserId: evanId, fullName: data.demoUser.name, relationship: "self" })
    .returning();
  await db.insert(s.membershipFee).values({
    memberId: evanSelf.id,
    season: clubConfig.season,
    amountCents: clubConfig.membershipFeeCents,
    status: "paid",
    paidAt: new Date(),
  });
  for (const f of data.demoUser.family) {
    const [m] = await db
      .insert(s.member)
      .values({
        managedByUserId: evanId,
        fullName: f.fullName,
        relationship: f.relationship,
        code: f.code,
        team: f.team,
      })
      .returning();
    await db.insert(s.membershipFee).values({
      memberId: m.id,
      season: clubConfig.season,
      amountCents: clubConfig.membershipFeeCents,
      status: f.fee,
      paidAt: f.fee === "paid" ? new Date() : null,
    });
  }

  // --- Feed ---------------------------------------------------------------
  const insertedPosts = await db.insert(s.post).values(data.posts).returning();

  // --- Events -------------------------------------------------------------
  for (const { roles, ...e } of data.events) {
    const [created] = await db.insert(s.event).values(e).returning();
    if (roles.length) {
      await db.insert(s.volunteerRole).values(roles.map((r) => ({ ...r, eventId: created.id })));
    }
  }

  // --- Fundraising --------------------------------------------------------
  const [lockers] = await db
    .insert(s.goal)
    .values({ ...data.activeGoal, status: "active", activatedAt: new Date() })
    .returning();

  const proposed = [];
  for (const [i, { votes, ...g }] of data.proposedGoals.entries()) {
    const [created] = await db
      .insert(s.goal)
      // Stagger created_at so proposals keep their display order.
      .values({ ...g, status: "proposed", createdAt: new Date(Date.now() + i * 1000) })
      .returning();
    proposed.push({ goal: created, votes });
  }

  const [round] = await db
    .insert(s.votingRound)
    .values({ activeGoalId: lockers.id })
    .returning();

  // Community members who have already voted (they have no login).
  const totalVoters = proposed.reduce((n, p) => n + p.votes, 0);
  const voterRows = Array.from({ length: totalVoters }, (_, i) => ({
    id: crypto.randomUUID(),
    name: `Community member ${i + 1}`,
    email: `member${i + 1}@community.example`,
    emailVerified: true,
    roles: "player",
  }));
  await db.insert(s.user).values(voterRows);

  let v = 0;
  const votes = proposed.flatMap((p) =>
    Array.from({ length: p.votes }, () => ({
      roundId: round.id,
      userId: voterRows[v++].id,
      goalId: p.goal.id,
    })),
  );
  await db.insert(s.vote).values(votes);

  // A few likes so the feed feels lived in.
  await db.insert(s.postLike).values(
    insertedPosts.flatMap((p, pi) =>
      voterRows.slice(pi * 7, pi * 7 + 20 + pi).map((u) => ({ postId: p.id, userId: u.id })),
    ),
  );
}

export async function seedDatabase({ reset: shouldReset = false } = {}) {
  if (shouldReset) await reset();
  const existing = await db.select({ id: s.goal.id }).from(s.goal).limit(1);
  if (existing.length > 0) return false;
  await seed();
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase({ reset: process.argv.includes("--reset") })
    .then((seeded) => {
      console.log(seeded ? "✓ Demo data seeded" : "• Database already has data — skipped seeding");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
