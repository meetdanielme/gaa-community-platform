/**
 * White-label club configuration.
 *
 * Everything that makes this deployment "Saints" lives here. To run the
 * platform for another club, change these values (and the seed data in
 * `scripts/seed-data.ts`) — no component should hard-code the club's name,
 * colours or codes.
 */

export const codes = [
  { id: "hurling", label: "Hurling" },
  { id: "football", label: "Gaelic Football" },
  { id: "camogie", label: "Camogie" },
  { id: "ladies_football", label: "Ladies' Gaelic Football" },
] as const;

export type CodeId = (typeof codes)[number]["id"];

export const clubConfig = {
  name: "Saints",
  fullName: "Saints GAA Club",
  tagline: "One club. Every generation.",
  description:
    "The community platform for Saints GAA — hurling, football, camogie and ladies' football, together.",
  season: "2026/27",
  currency: "EUR",
  locale: "en-IE",
  timeZone: "Europe/Dublin",
  /** Brand colours. Injected as CSS variables in the root layout. */
  colours: {
    primary: "#003660", // navy
    accent: "#ffcb05", // gold
    ink: "#231f20",
    muted: "#647482",
    pale: "#e8eff3",
    paper: "#f4f6f8",
  },
  codes,
  /** Membership fee per member per season, in cents. */
  membershipFeeCents: 12000,
  /** Preset one-off donation amounts in cents. */
  donationPresetsCents: [1000, 2500, 5000],
  maxDonationCents: 100000,
  /**
   * Demo mode seeds sample content, shows the demo sign-in buttons and resets
   * everything nightly. Set DEMO_MODE=false for a real club deployment.
   */
  demoMode: process.env.DEMO_MODE !== "false",
} as const;

/** Labels for event categories: the four codes plus club-wide categories. */
export const eventCategories: Record<string, string> = {
  ...Object.fromEntries(codes.map((c) => [c.id, c.label])),
  social: "Social",
  all: "All codes",
};

export function codeLabel(id: string | null | undefined) {
  if (!id) return "All codes";
  return eventCategories[id] ?? id;
}
