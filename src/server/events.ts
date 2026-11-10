import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { event, eventReminder, eventResponse, member } from "@/db/schema";
import { decideEventResponse, type EventResponseChoice } from "@/lib/rules/events";
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

/**
 * "Your upcoming events": events this account said it's going to, for any
 * member it manages, soonest first, with who is going.
 */
export async function listMyUpcomingEvents(userId: string) {
  const rows = await db
    .select({ event, memberName: member.fullName, relationship: member.relationship })
    .from(eventResponse)
    .innerJoin(event, eq(eventResponse.eventId, event.id))
    .innerJoin(member, eq(eventResponse.memberId, member.id))
    .where(
      and(
        eq(member.managedByUserId, userId),
        eq(eventResponse.response, "going"),
        gte(event.startsAt, new Date()),
        eq(event.status, "scheduled"),
      ),
    )
    .orderBy(asc(event.startsAt), asc(member.createdAt));

  const byEvent = new Map<string, { event: ClubEvent; going: string[] }>();
  for (const r of rows) {
    const entry = byEvent.get(r.event.id) ?? { event: r.event, going: [] };
    entry.going.push(r.relationship === "self" ? "You" : r.memberName.split(" ")[0]);
    byEvent.set(r.event.id, entry);
  }
  return [...byEvent.values()];
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

  return {
    event: e,
    goingCount: await goingCount(e.id),
    attendees: members.map((m) => ({
      member: m,
      response: (responseByMember.get(m.id) ?? null) as EventResponseChoice | null,
    })),
    reminderOn: Boolean(reminder),
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
