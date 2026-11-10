import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, type Database } from "@/db";
import { donation, goal, vote, votingRound } from "@/db/schema";
import { clubConfig } from "@/club.config";
import { decideClearVote, decideVote, type VoteDecision } from "@/lib/rules/voting";
import { decideProgression, type ProgressionDecision } from "@/lib/rules/progression";
import { validateDonation, type PaymentResult } from "@/lib/rules/payments";
import { canPay, canVote } from "@/lib/rules/roles";
import type { CurrentUser } from "@/lib/session";
import { payments, receiptNumber } from "./payments";

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Exec = Database | Tx;

export type Goal = typeof goal.$inferSelect;

/** Confirmed total = money raised offline + succeeded online donations. */
export async function confirmedTotalCents(exec: Exec, g: Goal) {
  const [row] = await exec
    .select({
      total: sql<number>`coalesce(sum(${donation.amountCents}), 0)::int`,
    })
    .from(donation)
    .where(and(eq(donation.goalId, g.id), eq(donation.status, "succeeded")));
  return g.offlineRaisedCents + Number(row?.total ?? 0);
}

export async function getOpenRound(exec: Exec) {
  const [round] = await exec
    .select()
    .from(votingRound)
    .where(eq(votingRound.status, "open"))
    .limit(1);
  return round ?? null;
}

/** Vote counts for every proposed goal in a round, in display order. */
export async function talliesForRound(exec: Exec, roundId: string | null) {
  const candidates = await exec
    .select()
    .from(goal)
    .where(eq(goal.status, "proposed"))
    .orderBy(asc(goal.createdAt));
  const counts = roundId
    ? await exec
        .select({ goalId: vote.goalId, votes: sql<number>`count(*)::int` })
        .from(vote)
        .where(eq(vote.roundId, roundId))
        .groupBy(vote.goalId)
    : [];
  const byGoal = new Map(counts.map((c) => [c.goalId, Number(c.votes)]));
  return candidates.map((g) => ({ goal: g, votes: byGoal.get(g.id) ?? 0 }));
}

export async function getFundraisingOverview(userId: string) {
  const [active] = await db.select().from(goal).where(eq(goal.status, "active")).limit(1);
  const round = await getOpenRound(db);
  const candidates = await talliesForRound(db, round?.id ?? null);

  let myVoteGoalId: string | null = null;
  if (round) {
    const [mine] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.roundId, round.id), eq(vote.userId, userId)));
    myVoteGoalId = mine?.goalId ?? null;
  }

  const [pending] = await db
    .select()
    .from(votingRound)
    .where(eq(votingRound.status, "pending_decision"))
    .limit(1);

  return {
    active: active ? { ...active, raisedCents: await confirmedTotalCents(db, active) } : null,
    round,
    candidates,
    myVoteGoalId,
    selectionPending: Boolean(pending) && !active,
  };
}

export async function getGoalBySlug(slug: string) {
  const [g] = await db.select().from(goal).where(eq(goal.slug, slug));
  if (!g) return null;
  return { ...g, raisedCents: await confirmedTotalCents(db, g) };
}

/** The most recently funded goal and the goal that followed it. */
export async function getLatestProgression() {
  const [round] = await db
    .select()
    .from(votingRound)
    .where(sql`${votingRound.status} in ('closed', 'pending_decision')`)
    .orderBy(desc(votingRound.closedAt))
    .limit(1);
  if (!round) return null;
  const [funded] = await db.select().from(goal).where(eq(goal.id, round.activeGoalId));
  const [next] = round.winningGoalId
    ? await db.select().from(goal).where(eq(goal.id, round.winningGoalId))
    : [];
  return {
    round,
    funded: { ...funded, raisedCents: await confirmedTotalCents(db, funded) },
    next: next ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* BR07 — vote for the next goal                                              */
/* -------------------------------------------------------------------------- */

export async function castVote(user: CurrentUser, goalId: string): Promise<VoteDecision> {
  return db.transaction(async (tx) => {
    const round = await getOpenRound(tx);
    const [candidate] = await tx.select().from(goal).where(eq(goal.id, goalId));
    const [current] = round
      ? await tx
          .select()
          .from(vote)
          .where(and(eq(vote.roundId, round.id), eq(vote.userId, user.id)))
      : [];

    const decision = decideVote({
      voterEligible: canVote(user.roles),
      roundOpen: Boolean(round),
      goalIsCandidate: candidate?.status === "proposed",
      currentChoiceGoalId: current?.goalId ?? null,
      newChoiceGoalId: goalId,
    });

    if (decision.outcome === "saved") {
      await tx.insert(vote).values({ roundId: round!.id, userId: user.id, goalId });
    } else if (decision.outcome === "replaced") {
      await tx
        .update(vote)
        .set({ goalId })
        .where(and(eq(vote.roundId, round!.id), eq(vote.userId, user.id)));
    }
    return decision;
  });
}

/** BR07 — withdraw your vote without choosing another goal. */
export async function clearVote(user: CurrentUser) {
  return db.transaction(async (tx) => {
    const round = await getOpenRound(tx);
    const [current] = round
      ? await tx
          .select()
          .from(vote)
          .where(and(eq(vote.roundId, round.id), eq(vote.userId, user.id)))
      : [];
    const decision = decideClearVote({
      voterEligible: canVote(user.roles),
      roundOpen: Boolean(round),
      hasChoice: Boolean(current),
    });
    if (decision.outcome === "cleared") {
      await tx.delete(vote).where(and(eq(vote.roundId, round!.id), eq(vote.userId, user.id)));
    }
    return decision;
  });
}

/* -------------------------------------------------------------------------- */
/* BR06 — make a donation, then BR08 — advance the goal                       */
/* -------------------------------------------------------------------------- */

export type DonationOutcome =
  | { ok: false; reason: "not_eligible" | "goal_not_active" | "invalid_amount" | "too_large" }
  | {
      ok: true;
      status: PaymentResult;
      receiptNumber: string | null;
      amountCents: number;
      progression: ProgressionDecision | null;
    };

export async function makeDonation(
  user: CurrentUser,
  input: { goalId: string; amountCents: number; methodId: string; idempotencyKey: string },
): Promise<DonationOutcome> {
  // A retried request returns the original result instead of charging again.
  const [existing] = await db
    .select()
    .from(donation)
    .where(eq(donation.idempotencyKey, input.idempotencyKey));
  if (existing) {
    return {
      ok: true,
      status: existing.status as PaymentResult,
      receiptNumber: existing.receiptNumber,
      amountCents: existing.amountCents,
      progression: null,
    };
  }

  if (!canPay(user.roles)) return { ok: false, reason: "not_eligible" };

  const [g] = await db.select().from(goal).where(eq(goal.id, input.goalId));
  const valid = validateDonation({
    goalStatus: g?.status ?? "missing",
    amountCents: input.amountCents,
    maxCents: clubConfig.maxDonationCents,
  });
  if (!valid.ok) return valid;

  // Record the attempt before charging so an uncertain result stays visible.
  const [pending] = await db
    .insert(donation)
    .values({
      goalId: g.id,
      userId: user.id,
      amountCents: input.amountCents,
      status: "pending",
      idempotencyKey: input.idempotencyKey,
    })
    .returning();

  const charge = await payments.charge({
    amountCents: input.amountCents,
    methodId: input.methodId,
    description: `Donation to ${g.title}`,
    idempotencyKey: input.idempotencyKey,
  });

  return db.transaction(async (tx) => {
    const receipt = charge.result === "succeeded" ? receiptNumber("DON") : null;
    await tx
      .update(donation)
      .set({ status: charge.result, paymentRef: charge.reference, receiptNumber: receipt })
      .where(eq(donation.id, pending.id));

    const progression =
      charge.result === "succeeded" ? await advanceIfFunded(tx, g.id) : null;

    return {
      ok: true as const,
      status: charge.result,
      receiptNumber: receipt,
      amountCents: input.amountCents,
      progression,
    };
  });
}

/**
 * Runs once per completed campaign. The goal row is locked so concurrent
 * confirmations cannot activate several next goals.
 */
export async function advanceIfFunded(tx: Tx, goalId: string): Promise<ProgressionDecision> {
  const [g] = await tx.select().from(goal).where(eq(goal.id, goalId)).for("update");
  if (!g || g.status !== "active") return { outcome: "retain" };

  const round = await getOpenRound(tx);
  const tallies = await talliesForRound(tx, round?.id ?? null);
  const decision = decideProgression({
    confirmedTotalCents: await confirmedTotalCents(tx, g),
    targetCents: g.targetCents,
    tallies: tallies.map((t) => ({ goalId: t.goal.id, votes: t.votes })),
  });
  if (decision.outcome === "retain") return decision;

  const now = new Date();
  await tx.update(goal).set({ status: "funded", fundedAt: now }).where(eq(goal.id, g.id));

  if (round) {
    await tx
      .update(votingRound)
      .set({
        status: decision.outcome === "advance" ? "closed" : "pending_decision",
        closedAt: now,
        winningGoalId: decision.outcome === "advance" ? decision.nextGoalId : null,
      })
      .where(eq(votingRound.id, round.id));
  }

  if (decision.outcome === "advance") {
    await tx
      .update(goal)
      .set({ status: "active", activatedAt: now })
      .where(eq(goal.id, decision.nextGoalId));
    // Previous votes do not carry forward into the new round.
    await tx.insert(votingRound).values({ activeGoalId: decision.nextGoalId });
  }
  return decision;
}
