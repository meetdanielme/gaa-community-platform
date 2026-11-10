import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, donation, event, goal, member, membershipFee, votingRound } from "@/db/schema";
import { clubConfig } from "@/club.config";
import { confirmedTotalCents } from "../fundraising";

export async function getDashboard() {
  const count = sql<number>`count(*)::int`;
  const sum = (col: typeof donation.amountCents | typeof membershipFee.amountCents) =>
    sql<number>`coalesce(sum(${col}), 0)::int`;

  const [[accounts], [members], fees, [donations], [upcoming], [active], [pending], activity] = await Promise.all([
    db.select({ n: count }).from(sql`"user"`).where(sql`exists (select 1 from account a where a.user_id = "user".id)`),
    db.select({ n: count }).from(member),
    db
      .select({ status: membershipFee.status, n: count, cents: sum(membershipFee.amountCents) })
      .from(membershipFee)
      .where(eq(membershipFee.season, clubConfig.season))
      .groupBy(membershipFee.status),
    db
      .select({ n: count, cents: sum(donation.amountCents) })
      .from(donation)
      .where(eq(donation.status, "succeeded")),
    db
      .select({ n: count })
      .from(event)
      .where(and(gte(event.startsAt, new Date()), eq(event.status, "scheduled"))),
    db.select().from(goal).where(eq(goal.status, "active")).limit(1),
    db.select().from(votingRound).where(eq(votingRound.status, "pending_decision")).limit(1),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(15),
  ]);

  const fee = (s: string) => fees.find((f) => f.status === s) ?? { n: 0, cents: 0 };
  return {
    accounts: Number(accounts.n),
    members: Number(members.n),
    fees: {
      paid: fee("paid"),
      sponsored: fee("sponsored"),
      outstanding: { n: Number(fee("unpaid").n) + Number(fee("pending").n), cents: Number(fee("unpaid").cents) + Number(fee("pending").cents) },
    },
    donations: { n: Number(donations.n), cents: Number(donations.cents) },
    upcomingEvents: Number(upcoming.n),
    activeGoal: active ? { ...active, raisedCents: await confirmedTotalCents(db, active) } : null,
    selectionPending: Boolean(pending) && !active,
    activity,
  };
}
