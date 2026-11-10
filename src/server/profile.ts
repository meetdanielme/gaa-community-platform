import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { member, membershipFee, user as userTable } from "@/db/schema";
import { clubConfig } from "@/club.config";
import { decideFeePayment } from "@/lib/rules/payments";
import { canPay } from "@/lib/rules/roles";
import { syncMembershipFee } from "@/lib/rules/membership";
import type { Tx } from "./fundraising";
import type { CurrentUser } from "@/lib/session";
import { payments, receiptNumber } from "./payments";

export type Member = typeof member.$inferSelect;
export type MembershipFee = typeof membershipFee.$inferSelect;

export async function getFamily(userId: string) {
  const members = await db.query.member.findMany({
    where: eq(member.managedByUserId, userId),
    orderBy: asc(member.createdAt),
    with: { fees: true },
  });
  return members.map((m) => ({
    ...m,
    fee: m.fees.find((f) => f.season === clubConfig.season) ?? null,
  }));
}

/** BR01: only the managing account may view a member profile. */
export async function getManagedMember(userId: string, memberId: string) {
  const m = await db.query.member.findFirst({
    where: and(eq(member.id, memberId), eq(member.managedByUserId, userId)),
    with: { fees: true },
  });
  if (!m) return null;
  return { ...m, fee: m.fees.find((f) => f.season === clubConfig.season) ?? null };
}

export async function updateContactDetails(
  userId: string,
  input: { name: string; phone: string | null; eircode: string | null },
) {
  await db.transaction(async (tx) => {
    await tx.update(userTable).set(input).where(eq(userTable.id, userId));
    // Keep the "self" member profile's name in step with the account.
    await tx
      .update(member)
      .set({ fullName: input.name })
      .where(and(eq(member.managedByUserId, userId), eq(member.relationship, "self")));
  });
}

export type MemberInput = {
  id?: string;
  fullName: string;
  relationship: string;
  code: string | null;
  team: string | null;
};

/** Keeps this season's fee in step with whether the member plays a code. */
async function syncFee(tx: Tx, m: { id: string; code: string | null }) {
  const [fee] = await tx
    .select()
    .from(membershipFee)
    .where(and(eq(membershipFee.memberId, m.id), eq(membershipFee.season, clubConfig.season)));
  const action = syncMembershipFee({ code: m.code, feeStatus: fee?.status ?? null });
  if (action === "create") {
    await tx
      .insert(membershipFee)
      .values({ memberId: m.id, season: clubConfig.season, amountCents: clubConfig.membershipFeeCents });
  } else if (action === "remove" && fee) {
    await tx.delete(membershipFee).where(eq(membershipFee.id, fee.id));
  }
}

/**
 * BR01: creates or updates a family member managed by `managerUserId`. Only
 * that account (or a club admin acting for it) may call this. Members who
 * play a code get a membership fee for the current season.
 */
export async function saveMember(managerUserId: string, input: MemberInput) {
  // The "self" profile is tied to the account: its name comes from the
  // contact details and its relationship can never change.
  const relationship = input.relationship === "self" ? "other" : input.relationship;
  return db.transaction(async (tx) => {
    if (input.id) {
      const [updated] = await tx
        .update(member)
        .set({
          fullName: sql`case when ${member.relationship} = 'self' then ${member.fullName} else ${input.fullName} end`,
          relationship: sql`case when ${member.relationship} = 'self' then 'self' else ${relationship} end`,
          code: input.code,
          team: input.team,
        })
        .where(and(eq(member.id, input.id), eq(member.managedByUserId, managerUserId)))
        .returning();
      if (updated) await syncFee(tx, updated);
      return updated ?? null;
    }
    const [created] = await tx
      .insert(member)
      .values({ managedByUserId: managerUserId, fullName: input.fullName, relationship, code: input.code, team: input.team })
      .returning();
    await syncFee(tx, created);
    return created;
  });
}

/** Unlinks a family member. The account holder's own profile can't be removed. */
export async function removeMember(managerUserId: string, memberId: string) {
  const removed = await db
    .delete(member)
    .where(and(eq(member.id, memberId), eq(member.managedByUserId, managerUserId), ne(member.relationship, "self")))
    .returning();
  return removed[0] ?? null;
}

/** "Your donations": the signed-in person's donation history. */
export async function getMyDonations(userId: string) {
  return db.query.donation.findMany({
    where: (d, { eq: e }) => e(d.userId, userId),
    orderBy: (d, { desc }) => desc(d.createdAt),
    with: { goal: { columns: { title: true, slug: true } } },
  });
}

/* BR05 — pay a membership fee. */
export async function payMembershipFee(user: CurrentUser, feeId: string, methodId: string) {
  const fee = await db.query.membershipFee.findFirst({
    where: eq(membershipFee.id, feeId),
    with: { member: true },
  });
  const decision = decideFeePayment({
    authorised: Boolean(fee && fee.member.managedByUserId === user.id && canPay(user.roles)),
    status: fee?.status ?? "missing",
  });
  if (!decision.ok) return decision;
  if (!fee) return { ok: false as const, reason: "not_authorised" as const };

  // Mark pending first so a concurrent request cannot charge twice.
  const claimed = await db
    .update(membershipFee)
    .set({ status: "pending" })
    .where(and(eq(membershipFee.id, fee.id), eq(membershipFee.status, "unpaid")))
    .returning();
  if (claimed.length === 0) return { ok: false as const, reason: "pending" as const };

  const charge = await payments.charge({
    amountCents: fee.amountCents,
    methodId,
    description: `${clubConfig.season} membership — ${fee.member.fullName}`,
    idempotencyKey: `fee_${fee.id}_${Date.now()}`,
  });

  if (charge.result === "succeeded") {
    const receipt = receiptNumber("FEE");
    await db
      .update(membershipFee)
      .set({
        status: "paid",
        paidAt: new Date(),
        paidByUserId: user.id,
        paymentRef: receipt,
      })
      .where(eq(membershipFee.id, fee.id));
    return { ok: true as const, status: "succeeded" as const, receipt };
  }
  if (charge.result === "declined") {
    await db.update(membershipFee).set({ status: "unpaid" }).where(eq(membershipFee.id, fee.id));
  }
  return { ok: true as const, status: charge.result, receipt: null };
}
