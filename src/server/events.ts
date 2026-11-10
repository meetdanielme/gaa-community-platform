import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  event,
  eventReminder,
  eventResponse,
  member,
  volunteerAssignment,
  volunteerRole,
} from "@/db/schema";
import {
  decideEventResponse,
  decideVolunteer,
  type EventResponseChoice,
} from "@/lib/rules/events";
import { canVolunteer } from "@/lib/rules/roles";
import type { CurrentUser } from "@/lib/session";

export type ClubEvent = typeof event.$inferSelect;

/** Upcoming events first (soonest first), then past events (latest first). */
export async function listEvents(category?: string) {
  const now = new Date();
  const filter = category ? eq(event.category, category) : undefined;
  const upcoming = await db
    .select()
    .from(event)
    .where(and(gte(event.startsAt, now), filter))
    .orderBy(asc(event.startsAt));
  const past = await db
    .select()
    .from(event)
    .where(and(lt(event.startsAt, now), filter))
    .orderBy(desc(event.startsAt));
  return { upcoming, past };
}

async function goingCount(eventId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(eventResponse)
    .where(and(eq(eventResponse.eventId, eventId), eq(eventResponse.response, "going")));
  return Number(row?.n ?? 0);
}

export async function getEventDetail(slug: string, userId: string) {
  const [e] = await db.select().from(event).where(eq(event.slug, slug));
  if (!e) return null;

  const members = await db
    .select()
    .from(member)
    .where(eq(member.managedByUserId, userId))
    .orderBy(asc(member.createdAt));

  const responses = members.length
    ? await db
        .select()
        .from(eventResponse)
        .where(
          and(
            eq(eventResponse.eventId, e.id),
            inArray(
              eventResponse.memberId,
              members.map((m) => m.id),
            ),
          ),
        )
    : [];
  const responseByMember = new Map(responses.map((r) => [r.memberId, r.response]));

  const [reminder] = await db
    .select()
    .from(eventReminder)
    .where(and(eq(eventReminder.eventId, e.id), eq(eventReminder.userId, userId)));

  const roles = await db.query.volunteerRole.findMany({
    where: eq(volunteerRole.eventId, e.id),
    with: { assignments: true },
  });

  return {
    event: e,
    goingCount: await goingCount(e.id),
    attendees: members.map((m) => ({
      member: m,
      response: (responseByMember.get(m.id) ?? null) as EventResponseChoice | null,
    })),
    reminderOn: Boolean(reminder),
    volunteerRoles: roles.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      requirement: r.requirement,
      capacity: r.capacity,
      assignedCount: r.assignments.length,
      mine: r.assignments.some((a) => a.userId === userId),
    })),
  };
}

/* BR03 — respond to an event invitation, for yourself or a linked member. */
export async function respondToEvent(
  user: CurrentUser,
  input: { eventId: string; memberId: string; choice: EventResponseChoice },
) {
  return db.transaction(async (tx) => {
    const [e] = await tx.select().from(event).where(eq(event.id, input.eventId)).for("update");
    const [m] = await tx.select().from(member).where(eq(member.id, input.memberId));
    if (!e) return { ok: false as const, reason: "cancelled" as const };

    const [previous] = await tx
      .select()
      .from(eventResponse)
      .where(and(eq(eventResponse.eventId, e.id), eq(eventResponse.memberId, input.memberId)));
    const [count] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(eventResponse)
      .where(and(eq(eventResponse.eventId, e.id), eq(eventResponse.response, "going")));

    const decision = decideEventResponse({
      authorised: m?.managedByUserId === user.id,
      cancelled: e.status === "cancelled",
      startsAt: e.startsAt,
      rsvpDeadline: e.rsvpDeadline,
      now: new Date(),
      previous: (previous?.response ?? null) as EventResponseChoice | null,
      choice: input.choice,
      goingCount: Number(count?.n ?? 0),
      capacity: e.capacity,
    });
    if (!decision.ok) return decision;

    await tx
      .insert(eventResponse)
      .values({
        eventId: e.id,
        memberId: input.memberId,
        response: input.choice,
        respondedByUserId: user.id,
      })
      .onConflictDoUpdate({
        target: [eventResponse.eventId, eventResponse.memberId],
        set: { response: input.choice, respondedByUserId: user.id, updatedAt: new Date() },
      });
    return decision;
  });
}

export async function setReminder(userId: string, eventId: string, on: boolean) {
  if (on) {
    await db.insert(eventReminder).values({ userId, eventId }).onConflictDoNothing();
  } else {
    await db
      .delete(eventReminder)
      .where(and(eq(eventReminder.userId, userId), eq(eventReminder.eventId, eventId)));
  }
}

/* BR04 — volunteer for an activity. */
export async function volunteerForRole(
  user: CurrentUser,
  input: { roleId: string; acknowledgeConflict: boolean },
) {
  return db.transaction(async (tx) => {
    const [role] = await tx
      .select()
      .from(volunteerRole)
      .where(eq(volunteerRole.id, input.roleId))
      .for("update");
    if (!role) return { ok: false as const, reason: "closed" as const };
    const [e] = await tx.select().from(event).where(eq(event.id, role.eventId));

    const assignments = await tx
      .select()
      .from(volunteerAssignment)
      .where(eq(volunteerAssignment.roleId, role.id));

    // A conflict is another commitment on the same calendar day.
    const sameDay = await tx
      .select({ id: volunteerRole.id })
      .from(volunteerAssignment)
      .innerJoin(volunteerRole, eq(volunteerAssignment.roleId, volunteerRole.id))
      .innerJoin(event, eq(volunteerRole.eventId, event.id))
      .where(
        and(
          eq(volunteerAssignment.userId, user.id),
          sql`${event.startsAt}::date = ${e.startsAt.toISOString()}::date`,
          sql`${volunteerRole.id} <> ${role.id}`,
        ),
      );

    const decision = decideVolunteer({
      eligible: canVolunteer(user.roles),
      eventOpen: e.status !== "cancelled" && e.startsAt > new Date(),
      assignedCount: assignments.length,
      capacity: role.capacity,
      alreadyAssigned: assignments.some((a) => a.userId === user.id),
      hasConflict: sameDay.length > 0,
      acknowledgedConflict: input.acknowledgeConflict,
    });
    if (!decision.ok) return decision;

    await tx.insert(volunteerAssignment).values({
      roleId: role.id,
      userId: user.id,
      acknowledgedConflict: input.acknowledgeConflict,
    });
    return decision;
  });
}

export async function withdrawFromRole(userId: string, roleId: string) {
  await db
    .delete(volunteerAssignment)
    .where(and(eq(volunteerAssignment.roleId, roleId), eq(volunteerAssignment.userId, userId)));
}
