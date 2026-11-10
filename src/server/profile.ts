import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { member, membershipFee, user as userTable } from "@/db/schema";
import { clubConfig } from "@/club.config";
import { decideFeePayment } from "@/lib/rules/payments";
import { canPay } from "@/lib/rules/roles";
import type { CurrentUser } from "@/lib/session";
import { payments, receiptNumber } from "./payments";

export type Member = typeof member.$inferSelect;
export type MembershipFee = typeof membershipFee.$inferSelect;

/**
 * Linked family members come from club records; teams and memberships are
 * updated by the club, not in the app.
 */
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
