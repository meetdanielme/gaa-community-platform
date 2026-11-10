import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { donation, goal, user, votingRound, type BreakdownItem } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { uniqueSlug } from "@/lib/slug";
import type { CurrentUser } from "@/lib/session";
import { audit } from "../audit";
import { advanceIfFunded, confirmedTotalCents, getOpenRound, talliesForRound } from "../fundraising";

export type GoalInput = {
  title: string;
  purpose: string | null;
  headline: string | null;
  description: string | null;
  targetCents: number;
  breakdown: BreakdownItem[];
};

export async function listGoalsAdmin() {
  const goals = await db.select().from(goal).orderBy(asc(goal.createdAt));
  const round = await getOpenRound(db);
  const tallies = await talliesForRound(db, round?.id ?? null);
  const votes = new Map(tallies.map((t) => [t.goal.id, t.votes]));
  const [pending] = await db
    .select()
    .from(votingRound)
    .where(eq(votingRound.status, "pending_decision"))
    .limit(1);
  return {
    goals: await Promise.all(
      goals.map(async (g) => ({ ...g, raisedCents: await confirmedTotalCents(db, g), votes: votes.get(g.id) ?? 0 })),
    ),
    round,
    pendingDecision: pending ?? null,
  };
}

export async function getGoalAdmin(id: string) {
  const [g] = await db.select().from(goal).where(eq(goal.id, id));
  return g ? { ...g, raisedCents: await confirmedTotalCents(db, g) } : null;
}

export async function saveGoal(actor: CurrentUser, input: GoalInput & { id?: string }) {
  return db.transaction(async (tx) => {
    if (input.id) {
      const [existing] = await tx.select().from(goal).where(eq(goal.id, input.id));
      if (!existing) return { ok: false as const, error: "Goal not found." };
      if (existing.status === "funded") return { ok: false as const, error: "Funded goals can't be edited." };
      const { id, ...values } = input;
      await tx.update(goal).set(values).where(eq(goal.id, id));
      await audit(tx, actor, "goal.update", `Updated goal "${input.title}"`);
      return { ok: true as const, id };
    }
    const slug = await uniqueSlug(input.title, async (s) =>
      Boolean((await tx.select({ id: goal.id }).from(goal).where(eq(goal.slug, s))).length),
    );
    const [created] = await tx.insert(goal).values({ ...input, slug, status: "proposed" }).returning();
    await audit(tx, actor, "goal.propose", `Proposed goal "${input.title}" (${formatMoney(input.targetCents)})`);
    return { ok: true as const, id: created.id };
  });
}

/** Proposed goals can be withdrawn from (and restored to) the ballot. */
export async function setGoalWithdrawn(actor: CurrentUser, goalId: string, withdrawn: boolean) {
  await db.transaction(async (tx) => {
    const [g] = await tx.select().from(goal).where(eq(goal.id, goalId));
    if (!g || g.status !== (withdrawn ? "proposed" : "withdrawn")) return;
    await tx.update(goal).set({ status: withdrawn ? "withdrawn" : "proposed" }).where(eq(goal.id, goalId));
    await audit(tx, actor, withdrawn ? "goal.withdraw" : "goal.restore", `${withdrawn ? "Withdrew" : "Restored"} goal "${g.title}"`);
  });
}

/**
 * Records money raised outside the platform (bucket collections, events)
 * against the active goal. Counts toward the target, so it can complete the
 * campaign and trigger BR08 progression.
 */
export async function recordOfflineFunds(actor: CurrentUser, goalId: string, amountCents: number, note: string) {
  return db.transaction(async (tx) => {
    const [g] = await tx.select().from(goal).where(eq(goal.id, goalId)).for("update");
    if (!g || g.status !== "active") return { ok: false as const, error: "Only the active goal can receive funds." };
    await tx
      .update(goal)
      .set({ offlineRaisedCents: sql`${goal.offlineRaisedCents} + ${amountCents}` })
      .where(eq(goal.id, goalId));
    await audit(tx, actor, "goal.offline_funds", `Recorded ${formatMoney(amountCents)} for "${g.title}"${note ? ` — ${note}` : ""}`);
    const progression = await advanceIfFunded(tx, goalId);
    return { ok: true as const, progression };
  });
}

/**
 * Makes a goal the active one. Used to start fundraising in a new club, and
 * to publish the club's decision when a vote ends in a tie (BR08 "selection
 * pending"). Opens a fresh voting round for the goal after it.
 */
export async function activateGoal(actor: CurrentUser, goalId: string) {
  return db.transaction(async (tx) => {
    const [active] = await tx.select().from(goal).where(eq(goal.status, "active")).for("update");
    if (active) return { ok: false as const, error: `"${active.title}" is still being funded.` };
    const [g] = await tx.select().from(goal).where(eq(goal.id, goalId));
    if (!g || g.status !== "proposed") return { ok: false as const, error: "Only proposed goals can be activated." };

    const now = new Date();
    const [pending] = await tx
      .select()
      .from(votingRound)
      .where(eq(votingRound.status, "pending_decision"));
    if (pending) {
      await tx
        .update(votingRound)
        .set({ status: "closed", winningGoalId: g.id })
        .where(eq(votingRound.id, pending.id));
    }
    await tx.update(goal).set({ status: "active", activatedAt: now }).where(eq(goal.id, g.id));
    const open = await getOpenRound(tx);
    if (open) await tx.update(votingRound).set({ status: "closed", closedAt: now }).where(eq(votingRound.id, open.id));
    await tx.insert(votingRound).values({ activeGoalId: g.id });
    await audit(
      tx,
      actor,
      pending ? "goal.resolve" : "goal.activate",
      pending ? `Resolved tied vote: "${g.title}" is the new goal` : `Activated goal "${g.title}"`,
    );
    return { ok: true as const };
  });
}

export async function listDonations(filter: { goalId?: string; status?: string }) {
  const rows = await db
    .select({
      id: donation.id,
      createdAt: donation.createdAt,
      amountCents: donation.amountCents,
      status: donation.status,
      receiptNumber: donation.receiptNumber,
      goalTitle: goal.title,
      donorName: user.name,
      donorEmail: user.email,
    })
    .from(donation)
    .innerJoin(goal, eq(donation.goalId, goal.id))
    .leftJoin(user, eq(donation.userId, user.id))
    .where(
      and(
        filter.goalId ? eq(donation.goalId, filter.goalId) : undefined,
        filter.status ? eq(donation.status, filter.status) : undefined,
      ),
    )
    .orderBy(desc(donation.createdAt))
    .limit(1000);
  const succeeded = rows.filter((r) => r.status === "succeeded");
  return {
    rows,
    totalCents: succeeded.reduce((n, r) => n + r.amountCents, 0),
    count: succeeded.length,
  };
}
