import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at").notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* -------------------------------------------------------------------------- */
/* Auth tables (Better Auth core schema)                                      */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  // Profile fields (Better Auth `additionalFields`)
  phone: text("phone"),
  eircode: text("eircode"),
  /** Comma-separated actor roles: player, family_supporter */
  roles: text("roles").notNull().default("family_supporter"),
  /** How this person helps the club, e.g. "Carpooling · First aid" (club records) */
  helpsWith: text("helps_with"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* -------------------------------------------------------------------------- */
/* Members & family (UC1 Maintain member and family profile)                  */
/* -------------------------------------------------------------------------- */

/**
 * A person who takes part in club life. Every account has a "self" member,
 * and a family supporter can manage linked members (e.g. children) who do
 * not have their own account.
 */
export const member = pgTable(
  "member",
  {
    id: id(),
    managedByUserId: text("managed_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    /** self | child | partner | sibling | other */
    relationship: text("relationship").notNull().default("child"),
    /** hurling | football | camogie | ladies_football — null if not playing */
    code: text("code"),
    team: text("team"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("member_manager_idx").on(t.managedByUserId)],
);

/** UC5 Pay membership fees */
export const membershipFee = pgTable(
  "membership_fee",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    season: text("season").notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** unpaid | pending | paid | sponsored */
    status: text("status").notNull().default("unpaid"),
    paidByUserId: text("paid_by_user_id").references(() => user.id),
    paymentRef: text("payment_ref"),
    paidAt: timestamp("paid_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("fee_member_season_uq").on(t.memberId, t.season)],
);

/* -------------------------------------------------------------------------- */
/* Feed (UC2 View club updates)                                               */
/* -------------------------------------------------------------------------- */

export const post = pgTable("post", {
  id: id(),
  authorName: text("author_name").notNull(),
  /** Short label shown next to the time, e.g. "Match report" */
  kind: text("kind").notNull(),
  /** One of the code ids, "social", or null for all codes */
  category: text("category"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  ctaLabel: text("cta_label"),
  ctaHref: text("cta_href"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Events (UC2 View events, UC3 Respond to event invitations)                */
/* -------------------------------------------------------------------------- */

export type ScheduleItem = { time: string; label: string };

export const event = pgTable("event", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  /** One of the code ids, "social", or "all" */
  category: text("category").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  venue: text("venue").notNull(),
  imageUrl: text("image_url"),
  headline: text("headline").notNull(),
  description: text("description").notNull(),
  schedule: jsonb("schedule").$type<ScheduleItem[]>().notNull().default([]),
  goodToKnow: text("good_to_know"),
  recap: text("recap"),
  /** Maximum attendees with a "going" response; null = unlimited */
  capacity: integer("capacity"),
  rsvpDeadline: timestamp("rsvp_deadline", { withTimezone: true }),
  /** scheduled | cancelled */
  status: text("status").notNull().default("scheduled"),
  createdAt: createdAt(),
});

export const eventResponse = pgTable(
  "event_response",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    /** going | not_going */
    response: text("response").notNull(),
    respondedByUserId: text("responded_by_user_id")
      .notNull()
      .references(() => user.id),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.memberId] })],
);

export const eventReminder = pgTable(
  "event_reminder",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

/* -------------------------------------------------------------------------- */
/* Fundraising (UC6 Make a donation, UC7 Vote for next donation goal)         */
/* -------------------------------------------------------------------------- */

export type BreakdownItem = { label: string; amountCents: number };

export const goal = pgTable("goal", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  /** One-line purpose shown on cards */
  purpose: text("purpose").notNull(),
  headline: text("headline"),
  description: text("description"),
  targetCents: integer("target_cents").notNull(),
  /** Funds raised outside the platform (e.g. a bucket collection) */
  offlineRaisedCents: integer("offline_raised_cents").notNull().default(0),
  breakdown: jsonb("breakdown").$type<BreakdownItem[]>().notNull().default([]),
  /** proposed | active | funded | withdrawn */
  status: text("status").notNull().default("proposed"),
  activatedAt: timestamp("activated_at"),
  fundedAt: timestamp("funded_at"),
  createdAt: createdAt(),
});

/**
 * A voting round runs while one goal is active. It closes when that goal is
 * funded (BR08) and its vote snapshot decides the next active goal.
 */
export const votingRound = pgTable(
  "voting_round",
  {
    id: id(),
    /** The goal being funded while this round is open */
    activeGoalId: text("active_goal_id")
      .notNull()
      .references(() => goal.id),
    /** open | closed | pending_decision */
    status: text("status").notNull().default("open"),
    winningGoalId: text("winning_goal_id").references(() => goal.id),
    openedAt: timestamp("opened_at").notNull().defaultNow(),
    closedAt: timestamp("closed_at"),
  },
  (t) => [
    // Only one round may be open at a time.
    uniqueIndex("one_open_round_uq")
      .on(t.status)
      .where(sql`${t.status} = 'open'`),
  ],
);

export const vote = pgTable(
  "vote",
  {
    roundId: text("round_id")
      .notNull()
      .references(() => votingRound.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    goalId: text("goal_id")
      .notNull()
      .references(() => goal.id),
    updatedAt: updatedAt(),
  },
  // BR07: one current choice per person per round.
  (t) => [primaryKey({ columns: [t.roundId, t.userId] })],
);

export const donation = pgTable(
  "donation",
  {
    id: id(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goal.id),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    amountCents: integer("amount_cents").notNull(),
    /** pending | succeeded | declined */
    status: text("status").notNull(),
    /** Client-generated key so a retried request never charges twice */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    paymentRef: text("payment_ref"),
    receiptNumber: text("receipt_number"),
    createdAt: createdAt(),
  },
  (t) => [index("donation_goal_idx").on(t.goalId)],
);

/* -------------------------------------------------------------------------- */
/* Relations (for db.query.*)                                                 */
/* -------------------------------------------------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
  members: many(member),
}));

export const memberRelations = relations(member, ({ one, many }) => ({
  manager: one(user, {
    fields: [member.managedByUserId],
    references: [user.id],
  }),
  fees: many(membershipFee),
  responses: many(eventResponse),
}));

export const membershipFeeRelations = relations(membershipFee, ({ one }) => ({
  member: one(member, {
    fields: [membershipFee.memberId],
    references: [member.id],
  }),
}));

export const eventRelations = relations(event, ({ many }) => ({
  responses: many(eventResponse),
}));

export const eventResponseRelations = relations(eventResponse, ({ one }) => ({
  event: one(event, { fields: [eventResponse.eventId], references: [event.id] }),
  member: one(member, {
    fields: [eventResponse.memberId],
    references: [member.id],
  }),
}));
