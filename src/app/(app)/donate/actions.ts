"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { voteRejectionMessages } from "@/lib/rules/voting";
import { castVote, clearVote, makeDonation } from "@/server/fundraising";

const donationSchema = z.object({
  goalId: z.string().uuid(),
  amountCents: z.number().int(),
  methodId: z.string().min(1).max(40),
  idempotencyKey: z.string().uuid(),
});

export type DonationActionResult =
  | { kind: "invalid"; message: string }
  | { kind: "succeeded"; receiptNumber: string; amountCents: number; goalFunded: boolean }
  | { kind: "declined" }
  | { kind: "pending" };

const invalidMessages = {
  not_eligible: "Donations are made by family supporters. Add the role in your profile to give.",
  goal_not_active: "This goal is no longer accepting donations. Take a look at the current goal.",
  invalid_amount: "Please choose an amount of at least €1.",
  too_large: "For gifts over €1,000 please contact the club treasurer.",
} as const;

export async function donateAction(input: z.infer<typeof donationSchema>): Promise<DonationActionResult> {
  const user = await requireUser();
  const parsed = donationSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", message: invalidMessages.invalid_amount };

  const outcome = await makeDonation(user, parsed.data);
  if (!outcome.ok) return { kind: "invalid", message: invalidMessages[outcome.reason] };

  refresh();
  if (outcome.status === "succeeded") {
    return {
      kind: "succeeded",
      receiptNumber: outcome.receiptNumber ?? "",
      amountCents: outcome.amountCents,
      goalFunded: outcome.progression !== null && outcome.progression.outcome !== "retain",
    };
  }
  return { kind: outcome.status };
}

export type VoteActionResult = { ok: true; changed: boolean } | { ok: false; error: string };

export async function voteAction(goalId: string): Promise<VoteActionResult> {
  const user = await requireUser();
  const decision = await castVote(user, z.string().uuid().parse(goalId));
  refresh();
  if (decision.outcome === "rejected") return { ok: false, error: voteRejectionMessages[decision.reason] };
  return { ok: true, changed: decision.outcome !== "unchanged" };
}

export async function clearVoteAction(): Promise<VoteActionResult> {
  const user = await requireUser();
  const decision = await clearVote(user);
  refresh();
  if (decision.outcome === "rejected") return { ok: false, error: voteRejectionMessages[decision.reason] };
  return { ok: true, changed: decision.outcome === "cleared" };
}
