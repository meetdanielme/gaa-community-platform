/**
 * BR05 Fee payment and BR06 Donation payment (activity diagrams D05, D06).
 */

export type PaymentResult = "succeeded" | "declined" | "pending";

/** BR06: is the donation request valid before we offer payment? */
export function validateDonation(input: {
  goalStatus: string;
  amountCents: number;
  maxCents: number;
}):
  | { ok: true }
  | { ok: false; reason: "goal_not_active" | "invalid_amount" | "too_large" } {
  if (input.goalStatus !== "active") return { ok: false, reason: "goal_not_active" };
  if (!Number.isInteger(input.amountCents) || input.amountCents < 100)
    return { ok: false, reason: "invalid_amount" };
  if (input.amountCents > input.maxCents) return { ok: false, reason: "too_large" };
  return { ok: true };
}

/** BR05: may this person pay this fee now? */
export function decideFeePayment(input: {
  authorised: boolean;
  status: string;
}): { ok: true } | { ok: false; reason: "not_authorised" | "already_paid" | "pending" } {
  if (!input.authorised) return { ok: false, reason: "not_authorised" };
  if (input.status === "paid" || input.status === "sponsored")
    return { ok: false, reason: "already_paid" };
  // Uncertain result: reconcile before offering another charge.
  if (input.status === "pending") return { ok: false, reason: "pending" };
  return { ok: true };
}
