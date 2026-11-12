/**
 * White-label club configuration.
 *
 * Everything that makes this deployment "Saints" lives here. To run the
 * platform for another club, change these values (and the demo content in
 * `src/server/demo-data.ts`) — no component should hard-code the club's
 * name, colours or codes.
 */

/**
 * Each code has its own tag colour (text on tint) so they're easy to tell
 * apart. A person can only combine codes from the same group, e.g. hurling
 * and football, or camogie and ladies' football.
 */
export const codes = [
  { id: "hurling", label: "Hurling", group: "mens", colour: "#1e4fa3", tint: "#e3ecfb" },
  { id: "football", label: "Gaelic Football", group: "mens", colour: "#17663a", tint: "#def5e6" },
  { id: "camogie", label: "Camogie", group: "womens", colour: "#7a2a9c", tint: "#f2e5f9" },
  { id: "ladies_football", label: "Ladies' Gaelic Football", group: "womens", colour: "#a3214a", tint: "#fbe3ea" },
] as const;

/** The group a code belongs to (see `codes`). */
export const codeGroup = (id: string) => codes.find((c) => c.id === id)?.group;

export type CodeId = (typeof codes)[number]["id"];

export const clubConfig = {
  name: "Saints",
  fullName: "Saints GAA Club",
  tagline: "One club. Every generation.",
  /** Every feed post is published under this name. */
  postAuthor: "Saints Club",
  description:
    "The community platform for Saints GAA — hurling, football, camogie and ladies' football, together.",
  season: "2026/27",
  currency: "EUR",
  locale: "en-IE",
  timeZone: "Europe/Dublin",
  /** Brand colours (see docs/brand). Injected as CSS variables in the root layout. */
  colours: {
    primary: "#003660", // blue
    accent: "#ffcb05", // yellow
    alert: "#e82c2e", // red: sparing accent, never for small text on white
    ink: "#231f20",
    muted: "#647482",
    pale: "#e8eff3",
    paper: "#f4f6f8",
  },
  /** Logo artwork. Keep the supplied lettering; don't retype the wordmark. */
  logo: { src: "/brand/saints-logo.png", width: 720, height: 223 },
  badge: { src: "/brand/saints-badge.png", width: 255, height: 256 },
  /** Public site address, used for share links and emails. */
  siteUrl: process.env.SITE_URL ?? "https://saintsgaa.social",
  codes,
  /** Membership fee per code per season, in cents (two codes = two fees). */
  membershipFeeCents: 12000,
  /** How many codes one person may play, e.g. hurling and football. */
  maxCodesPerMember: 2,
  /**
   * Age-grade teams, by age reached during the season's first year (the GAA
   * year-of-birth rule): someone who turns 11 or 12 in 2026 plays U12.
   * Anyone older than the last grade plays Adult.
   */
  ageGrades: [8, 10, 12, 14, 16, 18, 20],
  minPlayingAge: 4,
  /** From this age a linked member can be handed over to their own account. */
  adultAge: 18,
  /** How long a hand-over invitation link stays valid, in days. */
  handoverInviteDays: 14,
  /** Preset one-off donation amounts in cents. */
  donationPresetsCents: [1000, 2500, 5000],
  maxDonationCents: 100000,
  /**
   * Demo mode seeds sample content, shows the demo sign-in buttons and resets
   * everything nightly. Set DEMO_MODE=false for a real club deployment.
   */
  demoMode: process.env.DEMO_MODE !== "false",
} as const;

/**
 * Feed post types. Each has its own icon and colour so a match report never
 * looks like a training notice. Admins pick one when publishing.
 */
export const postKinds = [
  { id: "Club update", icon: "megaphone", colour: "#003660", tint: "#e1edf6" },
  { id: "Match report", icon: "trophy", colour: "#17663a", tint: "#def5e6" },
  { id: "Training notice", icon: "whistle", colour: "#8a4b00", tint: "#fdefd6" },
  { id: "Goal update", icon: "heart", colour: "#a3214a", tint: "#fbe3ea" },
  { id: "Behind the scenes", icon: "camera", colour: "#5b3d99", tint: "#ece6f8" },
] as const;

export type PostKindIcon = (typeof postKinds)[number]["icon"];

/** Unknown types (e.g. typed before this list existed) fall back to a neutral style. */
export function postKindStyle(kind: string) {
  return postKinds.find((k) => k.id === kind) ?? { id: kind, icon: "megaphone" as const, colour: "#647482", tint: "#eef1f4" };
}

/** Labels for event categories: the four codes plus club-wide categories. */
export const eventCategories: Record<string, string> = {
  ...Object.fromEntries(codes.map((c) => [c.id, c.label])),
  social: "Social",
  all: "All codes",
};

const categoryColours: Record<string, { colour: string; tint: string }> = {
  ...Object.fromEntries(codes.map((c) => [c.id, { colour: c.colour, tint: c.tint }])),
  social: { colour: "#8a4b00", tint: "#fdefd6" },
  all: { colour: "#003660", tint: "#e8eff3" },
};

export function codeColours(id: string | null | undefined) {
  return categoryColours[id ?? "all"] ?? categoryColours.all;
}

export function codeLabel(id: string | null | undefined) {
  if (!id) return "All codes";
  return eventCategories[id] ?? id;
}
