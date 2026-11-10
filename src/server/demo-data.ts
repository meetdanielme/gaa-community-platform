/**
 * Demo content for the Saints deployment, loaded when DEMO_MODE is on.
 * Another club would replace this file with its own content, or turn demo
 * mode off and create everything from the admin area.
 *
 * Dates are relative to "now" so a fresh demo always has upcoming events.
 * Costs are illustrative prototype values, not verified club spending.
 */
import { clubConfig } from "@/club.config";
import type { BreakdownItem, ScheduleItem } from "@/db/schema";
import { DEMO_ADMIN, DEMO_MEMBER, DEMO_PASSWORD } from "@/lib/demo";

export { DEMO_PASSWORD };

const DAY = 86_400_000;
export const daysFromNow = (days: number, hour = 11, minute = 0) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
};
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

export const demoUser = {
  name: "Evan Alam",
  email: DEMO_MEMBER.email,
  phone: "+353 123 45678",
  eircode: "T12 KV06",
  roles: "family_supporter",
  /** Teams come from date of birth (U18, U16 and Adult in 2026). Fees are per code. */
  family: [
    {
      fullName: "Sandu Alam",
      relationship: "child",
      dateOfBirth: "2009-04-12",
      memberships: [
        { code: "football", fee: "unpaid" },
        { code: "hurling", fee: "unpaid" },
      ],
    },
    {
      fullName: "Emmanuella Alam",
      relationship: "child",
      dateOfBirth: "2010-09-03",
      memberships: [
        { code: "camogie", fee: "paid" },
        { code: "ladies_football", fee: "unpaid" },
      ],
    },
    {
      fullName: "Daniel Alam",
      relationship: "sibling",
      dateOfBirth: "1999-01-20",
      memberships: [{ code: "hurling", fee: "sponsored" }],
    },
  ],
  /** Events the family has already said they're going to (by member name). */
  going: [
    { slug: "culture-night", fullName: "Evan Alam" },
    { slug: "culture-night", fullName: "Emmanuella Alam" },
  ],
};

export const demoAdmin = {
  name: "Aoife Byrne",
  email: DEMO_ADMIN.email,
  phone: "+353 21 400 1234",
  eircode: "T12 AB34",
  roles: "family_supporter",
};

export const posts = [
  {
    authorName: clubConfig.postAuthor,
    kind: "Match report",
    category: "camogie",
    title: "A brilliant morning together.",
    body: "Our U18s brought energy, teamwork and plenty of smiles to the friendly 5-aside. Thanks to every family who cheered them on.",
    imageUrl: "/images/sliotar.jpg",
    ctaLabel: "View match recap",
    ctaHref: "/events/ladies-friendly-5-aside",
    publishedAt: hoursAgo(26),
  },
  {
    authorName: clubConfig.postAuthor,
    kind: "Club update",
    category: "hurling",
    title: "Next stop: tournament day.",
    body: "Join Sandu and the squad at Devils Arena. Bring your club colours and your loudest sideline support.",
    imageUrl: "/images/sliotar.jpg",
    ctaLabel: "See event details",
    ctaHref: "/events/hurling-tournament",
    publishedAt: hoursAgo(2),
  },
  {
    authorName: clubConfig.postAuthor,
    kind: "Behind the scenes",
    category: null,
    title: "The pitch crew deserve a medal.",
    body: "Volunteers were out at first light getting the main pitch ready for the season. See you on it at the next home game.",
    imageUrl: "/images/pitch.jpg",
    ctaLabel: "See upcoming events",
    ctaHref: "/events",
    publishedAt: hoursAgo(5),
  },
  {
    authorName: clubConfig.postAuthor,
    kind: "Training notice",
    category: null,
    title: "Wet-weather training update",
    body: "If the pitches are waterlogged, all four codes will train in the hall on the usual nights. Coaches will confirm by 4pm on the day.",
    imageUrl: null,
    ctaLabel: null,
    ctaHref: null,
    publishedAt: hoursAgo(3),
  },
  {
    authorName: clubConfig.postAuthor,
    kind: "Goal update",
    category: null,
    title: "You choose what's next.",
    body: "Every member gets one vote on the club's next fundraising goal. The highest-voted proposal becomes our goal as soon as the lockers are funded.",
    imageUrl: "/images/stadium.jpg",
    ctaLabel: "Cast your vote",
    ctaHref: "/donate",
    publishedAt: hoursAgo(30),
  },
];

const standardSchedule: ScheduleItem[] = [
  { time: "10:30", label: "Meet the team" },
  { time: "10:45", label: "Warm-up and briefing" },
  { time: "11:00", label: "First matches" },
  { time: "13:00", label: "Club gathering" },
];

export const events = [
  {
    slug: "hurling-tournament",
    title: "Hurling Tournament",
    category: "hurling",
    startsAt: daysFromNow(8, 11),
    venue: "Devils Arena",
    imageUrl: "/images/sliotar.jpg",
    headline: "A day of hurling, family and club spirit.",
    description:
      "Cheer on our hurlers in a community tournament, with matches throughout the morning and a chance to catch up with other Saints families.",
    schedule: standardSchedule,
    goodToKnow:
      "Bring a water bottle and weather-appropriate clothing. Families are welcome. Contact your coach with accessibility or transport questions.",
    capacity: 120,
  },
  {
    slug: "culture-night",
    title: "Culture Night",
    category: "social",
    startsAt: daysFromNow(15, 18),
    venue: "Saints Arena",
    imageUrl: "/images/stadium.jpg",
    headline: "Music, food and stories from every corner of the club.",
    description:
      "An evening for all four codes and every generation: trad session, food from our families and a look back at Saints history.",
    schedule: [
      { time: "18:00", label: "Doors open" },
      { time: "18:30", label: "Trad session" },
      { time: "19:30", label: "Food from our families" },
      { time: "21:00", label: "Club stories" },
    ],
    goodToKnow: "Free entry. The clubhouse is wheelchair accessible.",
    capacity: 200,
  },
  {
    slug: "football-u18-blitz",
    title: "Football U18 Blitz",
    category: "football",
    startsAt: daysFromNow(8, 14),
    venue: "Saints Arena",
    imageUrl: "/images/pitch.jpg",
    headline: "Short games, big effort.",
    description: "Our U18 footballers host three visiting clubs for an afternoon blitz.",
    schedule: [
      { time: "13:30", label: "Arrive and warm up" },
      { time: "14:00", label: "Round-robin games" },
      { time: "16:00", label: "Final and presentation" },
    ],
    goodToKnow: "Players should bring both home and away jerseys.",
    capacity: 40,
  },
  {
    slug: "ladies-football-training-night",
    title: "Ladies' Football Open Night",
    category: "ladies_football",
    startsAt: daysFromNow(4, 19),
    venue: "Saints Arena",
    imageUrl: "/images/pitch.jpg",
    headline: "New to the game? Come and try it.",
    description: "An open training night for players of every age and experience. Boots optional, smiles required.",
    schedule: [
      { time: "19:00", label: "Welcome" },
      { time: "19:15", label: "Skills stations" },
      { time: "20:00", label: "Small-sided games" },
    ],
    goodToKnow: "Gumshields are provided for new players.",
    capacity: 30,
  },
  {
    slug: "ladies-friendly-5-aside",
    title: "Ladies Friendly 5-aside",
    category: "camogie",
    startsAt: daysFromNow(-6, 10),
    venue: "Saints Arena",
    imageUrl: "/images/sliotar.jpg",
    headline: "A brilliant morning together.",
    description: "Our U18s took on friends from across the county in a relaxed 5-aside.",
    schedule: [],
    goodToKnow: null,
    recap:
      "Our U18s brought energy, teamwork and plenty of smiles. Every player got game time and the sideline support was the loudest we've heard all season.",
    capacity: null,
  },
];

const lockerBreakdown: BreakdownItem[] = [
  { label: "40 lockers at €100", amountCents: 400000 },
  { label: "Delivery and installation", amountCents: 90000 },
  { label: "Preparation and fittings", amountCents: 40000 },
  { label: "Contingency", amountCents: 30000 },
];

export const activeGoal = {
  slug: "new-lockers",
  title: "New Lockers",
  purpose: "40 secure lockers for our shared changing rooms.",
  headline: "A place for every player",
  description:
    "Install 40 lockers to give our players secure storage for bags, phones and personal belongings, while keeping shared changing areas clear.\n\nHurling, Gaelic Football, Camogie and Ladies' Gaelic Football share these facilities.",
  targetCents: 560000,
  offlineRaisedCents: 174000,
  breakdown: lockerBreakdown,
};

/** Proposed goals with the vote counts shown in the prototype. */
export const proposedGoals = [
  {
    slug: "funding-for-equipment",
    title: "Funding for Equipment",
    purpose: "Hurleys, helmets, footballs and sliotars for every code.",
    targetCents: 400000,
    votes: 45,
    breakdown: [
      { label: "Helmets and hurleys", amountCents: 220000 },
      { label: "Footballs and sliotars", amountCents: 120000 },
      { label: "Training cones and bibs", amountCents: 60000 },
    ],
  },
  {
    slug: "fixing-roof",
    title: "Fixing Roof",
    purpose: "Repair the leaking clubhouse roof before winter.",
    targetCents: 300000,
    votes: 30,
    breakdown: [
      { label: "Roofing contractor", amountCents: 250000 },
      { label: "Materials", amountCents: 50000 },
    ],
  },
  {
    slug: "new-kits",
    title: "New Kits",
    purpose: "Matching jerseys for every team across all four codes.",
    targetCents: 550000,
    votes: 60,
    breakdown: [
      { label: "Jerseys", amountCents: 400000 },
      { label: "Shorts and socks", amountCents: 120000 },
      { label: "Printing", amountCents: 30000 },
    ],
  },
  {
    slug: "new-recovery-gear",
    title: "New Recovery Gear",
    purpose: "Ice baths, foam rollers and a physio table.",
    targetCents: 200000,
    votes: 20,
    breakdown: [
      { label: "Ice baths", amountCents: 120000 },
      { label: "Physio table and rollers", amountCents: 80000 },
    ],
  },
  {
    slug: "office-supplies",
    title: "Office Supplies",
    purpose: "A laptop and printer for the volunteer committee.",
    targetCents: 120000,
    votes: 15,
    breakdown: [
      { label: "Laptop", amountCents: 90000 },
      { label: "Printer", amountCents: 30000 },
    ],
  },
];
