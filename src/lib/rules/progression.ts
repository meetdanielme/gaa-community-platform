/**
 * BR08 Goal progression (activity diagram D06A).
 *
 * IF confirmed total is below target THEN retain current goal.
 * ELSE close current goal and voting round once; snapshot eligible votes.
 *   IF there is a unique highest-voted eligible goal
 *   THEN activate that goal and open the next round
 *   ELSE mark selection pending for a published club decision
 */

export type Tally = { goalId: string; votes: number };

export type ProgressionDecision =
  | { outcome: "retain" }
  | { outcome: "advance"; nextGoalId: string }
  | { outcome: "pending"; reason: "tie" | "no_candidates" | "no_votes" };

export function decideProgression(input: {
  confirmedTotalCents: number;
  targetCents: number;
  tallies: Tally[];
}): ProgressionDecision {
  if (input.confirmedTotalCents < input.targetCents) return { outcome: "retain" };

  if (input.tallies.length === 0) return { outcome: "pending", reason: "no_candidates" };

  const top = Math.max(...input.tallies.map((t) => t.votes));
  if (top === 0) return { outcome: "pending", reason: "no_votes" };

  const leaders = input.tallies.filter((t) => t.votes === top);
  if (leaders.length > 1) return { outcome: "pending", reason: "tie" };

  return { outcome: "advance", nextGoalId: leaders[0].goalId };
}
