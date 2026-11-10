/**
 * Membership fees are owed only for people registered to play a code, one
 * fee per code. Family supporters who don't play have no fee.
 */
export function requiresMembership(member: { codes: string[] }) {
  return member.codes.length > 0;
}

export type FeeSync = "create" | "remove" | "keep";

/** What to do with this season's fee for one code after a member's codes change. */
export function syncMembershipFee(input: { plays: boolean; feeStatus: string | null }): FeeSync {
  if (input.plays) return input.feeStatus === null ? "create" : "keep";
  // Paid or sponsored fees stay as financial records.
  return input.feeStatus === "unpaid" ? "remove" : "keep";
}

/**
 * Cancelling a membership someone has already paid for (or whose payment is
 * still being confirmed) alerts the family and the club, so a refund can be
 * looked at. Unpaid memberships are simply removed.
 */
export function cancellationNeedsAlert(feeStatus: string | null) {
  return feeStatus === "paid" || feeStatus === "pending";
}

/** "2026/27" → 2026 */
export function seasonStartYear(season: string) {
  return Number.parseInt(season.slice(0, 4), 10);
}

/**
 * Assigns an age-grade team from a date of birth (YYYY-MM-DD), using the age
 * reached during the season's first year. Returns null when the person is
 * too young to play.
 */
export function assignTeam(
  dateOfBirth: string,
  season: string,
  grades: readonly number[],
  minAge: number,
): string | null {
  const age = seasonStartYear(season) - Number.parseInt(dateOfBirth.slice(0, 4), 10);
  if (age < minAge) return null;
  const grade = [...grades].sort((a, b) => a - b).find((g) => age <= g);
  return grade ? `U${grade}` : "Adult";
}
