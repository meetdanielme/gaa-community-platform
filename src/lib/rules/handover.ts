/**
 * Handing a linked member over to their own account. Once someone turns
 * adult age, the family member who manages them (or a club admin) can invite
 * them to manage their own profile. The profile, with its memberships, fees
 * and event responses, moves to their account when they accept.
 */

/** Whole years between a date of birth (YYYY-MM-DD) and today. */
export function ageOn(dateOfBirth: string, today: Date) {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  let age = today.getUTCFullYear() - y;
  const beforeBirthday = today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** The date someone reaches `adultAge` (YYYY-MM-DD). */
export function adultFrom(dateOfBirth: string, adultAge: number) {
  return `${Number(dateOfBirth.slice(0, 4)) + adultAge}${dateOfBirth.slice(4)}`;
}

export type HandoverDecision =
  | { ok: true }
  | { ok: false; reason: "is_self" | "no_date_of_birth" | "too_young" };

/** May this member be handed over to their own account yet? */
export function decideHandover(input: {
  relationship: string;
  dateOfBirth: string | null;
  today: Date;
  adultAge: number;
}): HandoverDecision {
  if (input.relationship === "self") return { ok: false, reason: "is_self" };
  if (!input.dateOfBirth) return { ok: false, reason: "no_date_of_birth" };
  if (ageOn(input.dateOfBirth, input.today) < input.adultAge) return { ok: false, reason: "too_young" };
  return { ok: true };
}

export type ClaimDecision =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "already_claimed" | "wrong_account" | "account_has_profile" };

/**
 * May this signed-in account take over the profile? The account must use the
 * invited email, and must not already have its own member profile with club
 * history (a brand-new account's empty profile is replaced).
 */
export function decideClaim(input: {
  inviteFound: boolean;
  acceptedAt: Date | null;
  expiresAt: Date | null;
  now: Date;
  invitedEmail: string;
  accountEmail: string;
  accountProfileHasHistory: boolean;
}): ClaimDecision {
  if (!input.inviteFound) return { ok: false, reason: "not_found" };
  if (input.acceptedAt) return { ok: false, reason: "already_claimed" };
  if (input.expiresAt && input.expiresAt < input.now) return { ok: false, reason: "expired" };
  if (input.invitedEmail.toLowerCase() !== input.accountEmail.toLowerCase()) return { ok: false, reason: "wrong_account" };
  if (input.accountProfileHasHistory) return { ok: false, reason: "account_has_profile" };
  return { ok: true };
}

export const handoverMessages: Record<Exclude<HandoverDecision, { ok: true }>["reason"], string> = {
  is_self: "This is already the account holder's own profile.",
  no_date_of_birth: "Add their date of birth first.",
  too_young: "Members can manage their own profile once they're an adult.",
};

export const claimMessages: Record<Exclude<ClaimDecision, { ok: true }>["reason"], string> = {
  not_found: "This link isn't valid. Ask your family member or the club for a new one.",
  expired: "This link has expired. Ask your family member or the club to send a new one.",
  already_claimed: "This profile has already been moved to its own account.",
  wrong_account: "This invitation was sent to a different email address.",
  account_has_profile:
    "This account already has its own member profile with club history. Contact the club so they can merge the two.",
};
