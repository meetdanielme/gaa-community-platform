/**
 * Membership fees are owed only for people registered to play a code.
 * Family supporters who don't play have no fee.
 */
export function requiresMembership(member: { code: string | null }) {
  return member.code !== null;
}

export type FeeSync = "create" | "remove" | "keep";

/** What to do with this season's fee after a member's code changes. */
export function syncMembershipFee(input: { code: string | null; feeStatus: string | null }): FeeSync {
  if (requiresMembership(input)) return input.feeStatus === null ? "create" : "keep";
  // Paid or sponsored fees stay as financial records.
  return input.feeStatus === "unpaid" ? "remove" : "keep";
}
