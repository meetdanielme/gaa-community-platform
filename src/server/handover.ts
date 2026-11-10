import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  eventResponse,
  member,
  memberHandover,
  membership,
  membershipFee,
  user as userTable,
} from "@/db/schema";
import { clubConfig } from "@/club.config";
import { formatLongDate } from "@/lib/format";
import { decideClaim, decideHandover, handoverMessages } from "@/lib/rules/handover";
import { serializeRoles, type Role } from "@/lib/rules/roles";
import type { CurrentUser } from "@/lib/session";
import { sendEmail } from "./email";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const claimPath = (token: string) => `/claim/${token}`;

/** The pending (not yet accepted or expired) invitation for a member, if any. */
export async function getPendingHandover(memberId: string) {
  const [invite] = await db
    .select()
    .from(memberHandover)
    .where(and(eq(memberHandover.memberId, memberId), isNull(memberHandover.acceptedAt)))
    .orderBy(desc(memberHandover.createdAt))
    .limit(1);
  return invite && invite.expiresAt > new Date() ? invite : null;
}

/**
 * Invites an adult linked member to manage their own profile. Only the
 * account that manages them, or a club admin, may do this. Any earlier
 * pending invitation for the member is replaced. Returns the claim link so
 * it can also be shared directly.
 */
export async function inviteToOwnAccount(actor: CurrentUser, memberId: string, email: string) {
  const [m] = await db.select().from(member).where(eq(member.id, memberId));
  if (!m || (m.managedByUserId !== actor.id && !actor.isAdmin)) return { ok: false as const, error: "Member not found." };

  const decision = decideHandover({
    relationship: m.relationship,
    dateOfBirth: m.dateOfBirth,
    today: new Date(),
    adultAge: clubConfig.adultAge,
  });
  if (!decision.ok) return { ok: false as const, error: handoverMessages[decision.reason] };

  const [manager] = await db.select().from(userTable).where(eq(userTable.id, m.managedByUserId));
  const normalised = email.trim().toLowerCase();
  if (manager && manager.email.toLowerCase() === normalised) {
    return { ok: false as const, error: `Use ${m.fullName}'s own email address, not the family account's.` };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + clubConfig.handoverInviteDays * 86_400_000);
  await db.transaction(async (tx) => {
    await tx
      .delete(memberHandover)
      .where(and(eq(memberHandover.memberId, m.id), isNull(memberHandover.acceptedAt)));
    await tx.insert(memberHandover).values({
      memberId: m.id,
      email: normalised,
      tokenHash: hashToken(token),
      invitedByUserId: actor.id,
      expiresAt,
    });
    await tx.insert(auditLog).values({
      actorUserId: actor.id,
      actorName: actor.name,
      action: "member.handover_invite",
      summary: `Invited ${m.fullName} (${normalised}) to manage their own profile`,
    });
  });

  const link = `${clubConfig.siteUrl}${claimPath(token)}`;
  await sendEmail({
    to: normalised,
    subject: `Your ${clubConfig.name} member profile is ready for you`,
    text: `Hi ${m.fullName},\n\n${actor.name} has invited you to manage your own ${clubConfig.fullName} member profile, now that you're an adult. Your memberships, fees and event responses come with you.\n\nCreate an account (or sign in) with this email address, then accept here:\n${link}\n\nThe link expires on ${formatLongDate(expiresAt)}.\n\n${clubConfig.fullName}`,
  });
  return { ok: true as const, link, email: normalised, expiresAt };
}

/** Withdraws a pending invitation. */
export async function cancelHandover(actor: CurrentUser, memberId: string) {
  const [m] = await db.select().from(member).where(eq(member.id, memberId));
  if (!m || (m.managedByUserId !== actor.id && !actor.isAdmin)) return false;
  await db
    .delete(memberHandover)
    .where(and(eq(memberHandover.memberId, memberId), isNull(memberHandover.acceptedAt)));
  return true;
}

/** What the claim page shows for a token. */
export async function getHandoverByToken(token: string) {
  const [row] = await db
    .select({ invite: memberHandover, memberName: member.fullName, managerName: userTable.name })
    .from(memberHandover)
    .innerJoin(member, eq(memberHandover.memberId, member.id))
    .leftJoin(userTable, eq(member.managedByUserId, userTable.id))
    .where(eq(memberHandover.tokenHash, hashToken(token)));
  return row ?? null;
}

/**
 * The signed-in person takes over the profile they were invited to. Their
 * new account's empty "self" profile is replaced by the invited one, which
 * keeps its memberships, fees and event responses.
 */
export async function claimProfile(account: CurrentUser, token: string) {
  const result = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(memberHandover)
      .where(eq(memberHandover.tokenHash, hashToken(token)))
      .for("update");

    const [ownProfile] = await tx
      .select()
      .from(member)
      .where(and(eq(member.managedByUserId, account.id), eq(member.relationship, "self")));
    let hasHistory = false;
    if (ownProfile) {
      const [ms] = await tx.select().from(membership).where(eq(membership.memberId, ownProfile.id)).limit(1);
      const [fee] = await tx.select().from(membershipFee).where(eq(membershipFee.memberId, ownProfile.id)).limit(1);
      const [resp] = await tx.select().from(eventResponse).where(eq(eventResponse.memberId, ownProfile.id)).limit(1);
      hasHistory = Boolean(ms || fee || resp);
    }

    const decision = decideClaim({
      inviteFound: Boolean(invite),
      acceptedAt: invite?.acceptedAt ?? null,
      expiresAt: invite?.expiresAt ?? null,
      now: new Date(),
      invitedEmail: invite?.email ?? "",
      accountEmail: account.email,
      accountProfileHasHistory: hasHistory,
    });
    if (!decision.ok) return decision;

    const [claimed] = await tx.select().from(member).where(eq(member.id, invite.memberId));
    const previousManagerId = claimed.managedByUserId;
    if (ownProfile) await tx.delete(member).where(eq(member.id, ownProfile.id));
    await tx
      .update(member)
      .set({ managedByUserId: account.id, relationship: "self", fullName: account.name })
      .where(eq(member.id, claimed.id));

    // They play, and now pay their own fees.
    const plays = await tx.select().from(membership).where(eq(membership.memberId, claimed.id)).limit(1);
    const roles: Role[] = [...account.roles, "family_supporter"];
    if (plays.length) roles.push("player");
    await tx.update(userTable).set({ roles: serializeRoles(roles) }).where(eq(userTable.id, account.id));

    await tx
      .update(memberHandover)
      .set({ acceptedAt: new Date(), acceptedByUserId: account.id })
      .where(eq(memberHandover.id, invite.id));
    await tx.insert(auditLog).values({
      actorUserId: account.id,
      actorName: account.name,
      action: "member.handover_accept",
      summary: `${claimed.fullName} now manages their own profile (${account.email})`,
    });
    return { ok: true as const, memberName: claimed.fullName, previousManagerId };
  });

  if (result.ok) {
    const [previous] = await db.select().from(userTable).where(eq(userTable.id, result.previousManagerId));
    if (previous) {
      await sendEmail({
        to: previous.email,
        subject: `${result.memberName} now manages their own profile`,
        text: `Hi ${previous.name},\n\n${result.memberName} has accepted your invitation and now manages their own ${clubConfig.name} member profile, including their memberships and event responses. It no longer appears on your account.\n\n${clubConfig.fullName}`,
      });
    }
  }
  return result;
}
