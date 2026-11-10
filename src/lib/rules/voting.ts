/**
 * BR07 Voting (activity diagram D07).
 *
 * IF voter is eligible AND round is open AND goal is an eligible candidate
 * THEN
 *   IF same choice already saved THEN leave totals unchanged
 *   ELSE save or replace the single choice for (person, round)
 * ELSE reject change and refresh the available options
 */

export type VoteInput = {
  voterEligible: boolean;
  roundOpen: boolean;
  goalIsCandidate: boolean;
  currentChoiceGoalId: string | null;
  newChoiceGoalId: string;
};

export type VoteDecision =
  | { outcome: "rejected"; reason: "not_eligible" | "round_closed" | "not_candidate" }
  | { outcome: "unchanged" }
  | { outcome: "saved" }
  | { outcome: "replaced"; previousGoalId: string };

export function decideVote(input: VoteInput): VoteDecision {
  if (!input.voterEligible) return { outcome: "rejected", reason: "not_eligible" };
  if (!input.roundOpen) return { outcome: "rejected", reason: "round_closed" };
  if (!input.goalIsCandidate) return { outcome: "rejected", reason: "not_candidate" };
  if (input.currentChoiceGoalId === input.newChoiceGoalId) return { outcome: "unchanged" };
  if (input.currentChoiceGoalId)
    return { outcome: "replaced", previousGoalId: input.currentChoiceGoalId };
  return { outcome: "saved" };
}

/** A voter may withdraw their choice while the round is open, without picking another. */
export function decideClearVote(input: {
  voterEligible: boolean;
  roundOpen: boolean;
  hasChoice: boolean;
}): { outcome: "cleared" | "unchanged" } | { outcome: "rejected"; reason: "not_eligible" | "round_closed" } {
  if (!input.voterEligible) return { outcome: "rejected", reason: "not_eligible" };
  if (!input.roundOpen) return { outcome: "rejected", reason: "round_closed" };
  return { outcome: input.hasChoice ? "cleared" : "unchanged" };
}

export const voteRejectionMessages: Record<
  Extract<VoteDecision, { outcome: "rejected" }>["reason"],
  string
> = {
  not_eligible: "Voting is open to players and family supporters.",
  round_closed: "This voting round has closed. Take a look at the latest goals.",
  not_candidate: "That goal is no longer on the ballot.",
};
