import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, member, membership, membershipFee, user as userTable } from "@/db/schema";
import { clubConfig, codeLabel, codes } from "@/club.config";
import { formatMoney } from "@/lib/format";
import { decideFeePayment } from "@/lib/rules/payments";
import { canPay } from "@/lib/rules/roles";
import { assignTeam, cancellationNeedsAlert, syncMembershipFee } from "@/lib/rules/membership";
import { sendEmail } from "./email";
import type { Tx } from "./fundraising";
import type { CurrentUser } from "@/lib/session";
import { payments, receiptNumber } from "./payments";

export type Member = typeof member.$inferSelect;
export type MembershipFee = typeof membershipFee.$inferSelect;

/** The member's team this season, worked out from their date of birth. */
export function teamFor(m: { dateOfBirth: string | null }) {
  if (!m.dateOfBirth) return null;
  return assignTeam(m.dateOfBirth, clubConfig.season, clubConfig.ageGrades, clubConfig.minPlayingAge);
}

/** Codes in the club's display order, rather than the order they were added. */
function sortCodes(list: string[]) {
  const order = codes.map((c) => c.id as string);
  return [...list].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** Adds the member's codes, team and this season's fees (one per code). */
export function withSeason({
  memberships,
  fees: allFees,
  ...m
}: Member & { memberships: { code: string }[]; fees: MembershipFee[] }) {
  const playing = sortCodes(memberships.map((x) => x.code));
  const fees = allFees.filter((f) => f.season === clubConfig.season);
  return {
    ...m,
    codes: playing,
    team: playing.length ? teamFor(m) : null,
    /** Fees for codes the member plays now. */
    fees: playing.map((code) => ({ code, fee: fees.find((f) => f.code === code) ?? null })),
    /** Fees kept as records after a paid membership was cancelled. */
    cancelledFees: fees.filter((f) => !playing.includes(f.code)),
  };
}

export type MemberWithSeason = ReturnType<typeof withSeason>;

export async function getFamily(userId: string) {
  const members = await db.query.member.findMany({
    where: eq(member.managedByUserId, userId),
    orderBy: asc(member.createdAt),
    with: { fees: true, memberships: true },
  });
  return members.map(withSeason);
}

/** BR01: only the managing account may view a member profile. */
export async function getManagedMember(userId: string, memberId: string) {
  const m = await db.query.member.findFirst({
    where: and(eq(member.id, memberId), eq(member.managedByUserId, userId)),
    with: { fees: true, memberships: true },
  });
  return m ? withSeason(m) : null;
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
  /** The codes this person plays (up to clubConfig.maxCodesPerMember). */
  codes: string[];
  dateOfBirth: string | null;
};

/** A membership cancelled after it was paid for: the club is alerted. */
export type PaidCancellation = { code: string; status: string; amountCents: number };

/**
 * Keeps memberships and this season's fees (one per code) in step with the
 * codes a member plays. Returns paid memberships that were cancelled.
 */
async function syncMemberships(tx: Tx, memberId: string, playing: string[]) {
  const current = await tx.select().from(membership).where(eq(membership.memberId, memberId));
  const fees = await tx
    .select()
    .from(membershipFee)
    .where(and(eq(membershipFee.memberId, memberId), eq(membershipFee.season, clubConfig.season)));

  const added = playing.filter((c) => !current.some((m) => m.code === c));
  const removed = current.filter((m) => !playing.includes(m.code));
  if (added.length) await tx.insert(membership).values(added.map((code) => ({ memberId, code })));
  if (removed.length) await tx.delete(membership).where(inArray(membership.id, removed.map((m) => m.id)));

  for (const code of new Set([...playing, ...fees.map((f) => f.code)])) {
    const fee = fees.find((f) => f.code === code);
    const action = syncMembershipFee({ plays: playing.includes(code), feeStatus: fee?.status ?? null });
    if (action === "create") {
      await tx
        .insert(membershipFee)
        .values({ memberId, code, season: clubConfig.season, amountCents: clubConfig.membershipFeeCents });
    } else if (action === "remove" && fee) {
      await tx.delete(membershipFee).where(eq(membershipFee.id, fee.id));
    }
  }

  return removed.flatMap((m): PaidCancellation[] => {
    const fee = fees.find((f) => f.code === m.code);
    return fee && cancellationNeedsAlert(fee.status)
      ? [{ code: m.code, status: fee.status, amountCents: fee.amountCents }]
      : [];
  });
}

/**
 * Alerts the account holder and club admins when a paid membership is
 * cancelled, and records it in the governance log, so a refund can be
 * looked at. The fee itself is kept as a financial record.
 */
async function alertPaidCancellations(managerUserId: string, memberName: string, cancelled: PaidCancellation[]) {
  if (cancelled.length === 0) return;
  const [holder] = await db.select().from(userTable).where(eq(userTable.id, managerUserId));
  const admins = await db.select().from(userTable).where(eq(userTable.isAdmin, true));
  const list = cancelled
    .map((c) => `${codeLabel(c.code)} (${formatMoney(c.amountCents)}, ${c.status === "paid" ? "paid" : "payment pending"})`)
    .join(", ");

  await db.insert(auditLog).values({
    actorUserId: holder?.id ?? null,
    actorName: holder?.name ?? "Unknown",
    action: "membership.cancel_paid",
    summary: `${memberName}: cancelled paid ${clubConfig.season} membership — ${list}. Refund review needed.`,
  });
  const sends = [];
  if (holder) {
    sends.push(
      sendEmail({
        to: holder.email,
        subject: `Paid membership cancelled for ${memberName}`,
        text: `Hi ${holder.name},\n\nYou cancelled ${memberName}'s ${clubConfig.season} membership for ${list}, which had already been paid.\n\nWe've let the club treasurer know. They'll be in touch about a refund. If this was a mistake, add the code back on ${memberName}'s profile and nothing more will be charged.\n\n${clubConfig.fullName}`,
      }),
    );
  }
  for (const a of admins) {
    sends.push(
      sendEmail({
        to: a.email,
        subject: `Refund review: ${memberName} cancelled a paid membership`,
        text: `${holder?.name ?? "A member"} (${holder?.email ?? "unknown"}) cancelled ${memberName}'s ${clubConfig.season} membership for ${list}.\n\nThe payment record is kept. Please review whether a refund is due.\n\n${clubConfig.siteUrl}/admin/members/${managerUserId}`,
      }),
    );
  }
  await Promise.all(sends);
}

/**
 * BR01: creates or updates a family member managed by `managerUserId`. Only
 * that account (or a club admin acting for it) may call this. Each code a
 * member plays gets its own membership fee for the current season, and their
 * team is assigned from their date of birth.
 */
export async function saveMember(managerUserId: string, input: MemberInput) {
  // The "self" profile is tied to the account: its name comes from the
  // contact details and its relationship can never change.
  const relationship = input.relationship === "self" ? "other" : input.relationship;
  const result = await db.transaction(async (tx) => {
    let saved: Member | undefined;
    if (input.id) {
      [saved] = await tx
        .update(member)
        .set({
          fullName: sql`case when ${member.relationship} = 'self' then ${member.fullName} else ${input.fullName} end`,
          relationship: sql`case when ${member.relationship} = 'self' then 'self' else ${relationship} end`,
          dateOfBirth: input.dateOfBirth,
        })
        .where(and(eq(member.id, input.id), eq(member.managedByUserId, managerUserId)))
        .returning();
    } else {
      [saved] = await tx
        .insert(member)
        .values({ managedByUserId: managerUserId, fullName: input.fullName, relationship, dateOfBirth: input.dateOfBirth })
        .returning();
    }
    if (!saved) return null;
    const cancelledPaid = await syncMemberships(tx, saved.id, input.codes);
    return { ...saved, team: input.codes.length ? teamFor(saved) : null, cancelledPaid };
  });
  if (result) await alertPaidCancellations(managerUserId, result.fullName, result.cancelledPaid);
  return result;
}

/** Cancels one membership (code) for a member this account manages. */
export async function cancelMembership(managerUserId: string, memberId: string, code: string) {
  const m = await getManagedMember(managerUserId, memberId);
  if (!m || !m.codes.includes(code)) return null;
  return saveMember(managerUserId, {
    id: m.id,
    fullName: m.fullName,
    relationship: m.relationship,
    codes: m.codes.filter((c) => c !== code),
    dateOfBirth: m.dateOfBirth,
  });
}

/**
 * Unlinks a family member. The account holder's own profile can't be removed.
 * Removing someone whose membership is paid alerts the club, as cancelling does.
 */
export async function removeMember(managerUserId: string, memberId: string) {
  const fees = await db
    .select()
    .from(membershipFee)
    .where(and(eq(membershipFee.memberId, memberId), eq(membershipFee.season, clubConfig.season)));
  const removed = await db
    .delete(member)
    .where(and(eq(member.id, memberId), eq(member.managedByUserId, managerUserId), ne(member.relationship, "self")))
    .returning();
  if (!removed[0]) return null;
  await alertPaidCancellations(
    managerUserId,
    removed[0].fullName,
    fees
      .filter((f) => cancellationNeedsAlert(f.status))
      .map((f) => ({ code: f.code, status: f.status, amountCents: f.amountCents })),
  );
  return removed[0];
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
    description: `${clubConfig.season} ${codeLabel(fee.code)} membership — ${fee.member.fullName}`,
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
