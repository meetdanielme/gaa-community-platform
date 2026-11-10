import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { member, membershipFee, user } from "@/db/schema";
import { clubConfig } from "@/club.config";
import { serializeRoles, type Role } from "@/lib/rules/roles";
import type { CurrentUser } from "@/lib/session";
import { audit } from "../audit";
import { receiptNumber } from "../payments";

export async function listAccounts(q?: string) {
  const search = q?.trim();
  // Raw SQL with explicit aliases: correlated subqueries need qualified columns.
  const outstanding = sql<number>`(
    select count(*)::int from membership_fee f
    join member m on m.id = f.member_id
    where m.managed_by_user_id = "user".id
      and f.season = ${clubConfig.season}
      and f.status in ('unpaid', 'pending')
  )`;
  const familySize = sql<number>`(select count(*)::int from member m where m.managed_by_user_id = "user".id)`;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      familySize,
      outstanding,
    })
    .from(user)
    // Accounts without a password are seeded demo voters, not real members.
    .where(
      and(
        sql`exists (select 1 from account a where a.user_id = ${user.id})`,
        search ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)) : undefined,
      ),
    )
    .orderBy(asc(user.name))
    .limit(200);
}

export async function getAccount(userId: string) {
  const u = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!u) return null;
  const members = await db.query.member.findMany({
    where: eq(member.managedByUserId, userId),
    orderBy: asc(member.createdAt),
    with: { fees: true },
  });
  return {
    user: u,
    members: members.map((m) => ({ ...m, fee: m.fees.find((f) => f.season === clubConfig.season) ?? null })),
  };
}

export async function updateAccountAccess(
  actor: CurrentUser,
  userId: string,
  input: { roles: Role[]; isAdmin: boolean },
) {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(user).where(eq(user.id, userId));
    if (!target) return { ok: false as const, error: "Account not found." };
    if (target.isAdmin && !input.isAdmin) {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(user).where(eq(user.isAdmin, true));
      if (Number(n) <= 1) return { ok: false as const, error: "The club needs at least one admin." };
    }
    await tx.update(user).set({ roles: serializeRoles(input.roles), isAdmin: input.isAdmin }).where(eq(user.id, userId));
    const changes = [
      target.isAdmin !== input.isAdmin ? (input.isAdmin ? "granted admin" : "removed admin") : null,
      `roles: ${input.roles.join(", ") || "none"}`,
    ].filter(Boolean);
    await audit(tx, actor, "account.access", `${target.name}: ${changes.join("; ")}`);
    return { ok: true as const };
  });
}

/** Club-recorded fee payments: cash/bank transfer, sponsorship, or back to unpaid. */
export async function setFeeStatus(actor: CurrentUser, feeId: string, status: "paid" | "sponsored" | "unpaid") {
  await db.transaction(async (tx) => {
    const fee = await tx.query.membershipFee.findFirst({
      where: eq(membershipFee.id, feeId),
      with: { member: true },
    });
    if (!fee) return;
    await tx
      .update(membershipFee)
      .set({
        status,
        paidAt: status === "unpaid" ? null : new Date(),
        paidByUserId: status === "unpaid" ? null : actor.id,
        paymentRef: status === "paid" ? receiptNumber("CASH") : null,
      })
      .where(eq(membershipFee.id, feeId));
    await audit(tx, actor, "fee.status", `${fee.member.fullName} ${fee.season} membership → ${status}`);
  });
}

export async function createFeeIfMissing(actor: CurrentUser, memberId: string) {
  await db.transaction(async (tx) => {
    const [m] = await tx.select().from(member).where(eq(member.id, memberId));
    if (!m) return;
    const inserted = await tx
      .insert(membershipFee)
      .values({ memberId, season: clubConfig.season, amountCents: clubConfig.membershipFeeCents })
      .onConflictDoNothing()
      .returning();
    if (inserted.length) await audit(tx, actor, "fee.create", `Added ${clubConfig.season} membership for ${m.fullName}`);
  });
}
