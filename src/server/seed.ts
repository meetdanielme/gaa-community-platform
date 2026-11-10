/**
 * Loads the demo content (only in demo mode). Used by `pnpm dev`, the Vercel
 * build and the nightly demo reset.
 */
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { clubConfig } from "@/club.config";
import { db } from "@/db";
import * as s from "@/db/schema";
import * as data from "./demo-data";

async function reset() {
  await db.execute(sql`
    truncate table audit_log, vote, voting_round, donation, goal,
      event_reminder, event_response, event, post, membership_fee, membership, member_handover, member,
      session, account, verification, "user" cascade
  `);
}

async function createUser(input: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  eircode?: string;
  roles: string;
  isAdmin?: boolean;
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
    isAdmin: input.isAdmin ?? false,
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
  const adminId = await createUser({ ...data.demoAdmin, password: data.DEMO_PASSWORD, isAdmin: true });
  // Neither demo account plays, so they owe no membership themselves.
  const evanMembers = await db
    .insert(s.member)
    .values([
      { managedByUserId: adminId, fullName: data.demoAdmin.name, relationship: "self" },
      { managedByUserId: evanId, fullName: data.demoUser.name, relationship: "self" },
    ])
    .returning();
  for (const { memberships, ...f } of data.demoUser.family) {
    const [m] = await db
      .insert(s.member)
      .values({ managedByUserId: evanId, ...f })
      .returning();
    evanMembers.push(m);
    await db.insert(s.membership).values(memberships.map((ms) => ({ memberId: m.id, code: ms.code })));
    await db.insert(s.membershipFee).values(
      memberships.map((ms) => ({
        memberId: m.id,
        code: ms.code,
        season: clubConfig.season,
        amountCents: clubConfig.membershipFeeCents,
        status: ms.fee,
        paidAt: ms.fee === "paid" ? new Date() : null,
      })),
    );
  }

  // --- Feed ---------------------------------------------------------------
  await db.insert(s.post).values(data.posts);

  // --- Events -------------------------------------------------------------
  const events = await db.insert(s.event).values(data.events).returning();
  await db.insert(s.eventResponse).values(
    data.demoUser.going.map((g) => ({
      eventId: events.find((e) => e.slug === g.slug)!.id,
      memberId: evanMembers.find((m) => m.fullName === g.fullName && m.managedByUserId === evanId)!.id,
      response: "going",
      respondedByUserId: evanId,
    })),
  );

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
}

/**
 * Seeds demo content into an empty database. Returns false (and does
 * nothing) if the database already has data or demo mode is off.
 */
export async function seedDatabase({ reset: shouldReset = false } = {}) {
  if (!clubConfig.demoMode) return false;
  if (shouldReset) await reset();
  const existing = await db.select({ id: s.goal.id }).from(s.goal).limit(1);
  if (existing.length > 0) return false;
  await seed();
  return true;
}
