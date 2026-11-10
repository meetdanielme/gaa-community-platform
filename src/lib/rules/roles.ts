/**
 * Actor roles from the use-case model. A person may hold several roles; an
 * unconnected role alone does not grant access to a use case.
 */
export const ROLES = ["player", "family_supporter"] as const;
export type Role = (typeof ROLES)[number];

export const roleLabels: Record<Role, string> = {
  player: "Player",
  family_supporter: "Family supporter",
};

export function parseRoles(value: string | null | undefined): Role[] {
  if (!value) return [];
  return value
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is Role => (ROLES as readonly string[]).includes(r));
}

export function serializeRoles(roles: Role[]): string {
  return [...new Set(roles)].join(",");
}

const has = (roles: Role[], ...allowed: Role[]) =>
  roles.some((r) => allowed.includes(r));

/** UC7: Players and Family Supporters vote. */
export const canVote = (roles: Role[]) =>
  has(roles, "player", "family_supporter");

/** UC5 & UC6: Family Supporters pay fees and donate. */
export const canPay = (roles: Role[]) => has(roles, "family_supporter");
