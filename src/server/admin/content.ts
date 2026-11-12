import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { event, eventResponse, member, post, user, type ScheduleItem } from "@/db/schema";
import { clubConfig, codeLabel } from "@/club.config";
import { formatLongDate, formatTime } from "@/lib/format";
import { uniqueSlug } from "@/lib/slug";
import type { CurrentUser } from "@/lib/session";
import { audit } from "../audit";
import { sendEmail } from "../email";
import { teamFor } from "../profile";

/* ------------------------------------------------------------------ Posts */

export type PostInput = {
  kind: string;
  category: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  pinned: boolean;
};

export async function listPostsAdmin() {
  return db.select().from(post).orderBy(desc(post.pinned), desc(post.publishedAt));
}

export async function getPostAdmin(id: string) {
  const [p] = await db.select().from(post).where(eq(post.id, id));
  return p ?? null;
}

export async function savePost(actor: CurrentUser, input: PostInput & { id?: string }) {
  return db.transaction(async (tx) => {
    if (input.id) {
      const { id, ...values } = input;
      await tx.update(post).set({ ...values, authorName: clubConfig.postAuthor }).where(eq(post.id, id));
      await audit(tx, actor, "post.update", `Edited post "${input.title}"`);
      return id;
    }
    const [created] = await tx.insert(post).values({ ...input, authorName: clubConfig.postAuthor }).returning();
    await audit(tx, actor, "post.publish", `Published post "${input.title}"`);
    return created.id;
  });
}

export async function deletePost(actor: CurrentUser, id: string) {
  await db.transaction(async (tx) => {
    const [p] = await tx.delete(post).where(eq(post.id, id)).returning();
    if (p) await audit(tx, actor, "post.delete", `Deleted post "${p.title}"`);
  });
}

/* ----------------------------------------------------------------- Events */

export type EventInput = {
  title: string;
  category: string;
  startsAt: Date;
  venue: string;
  imageUrl: string | null;
  headline: string;
  description: string | null;
  schedule: ScheduleItem[];
  goodToKnow: string | null;
  recap: string | null;
  capacity: number | null;
  rsvpDeadline: Date | null;
};

const goingCount = sql<number>`(select count(*)::int from event_response r where r.event_id = "event".id and r.response = 'going')`;

export async function listEventsAdmin() {
  return db
    .select({ event, going: goingCount })
    .from(event)
    .orderBy(desc(event.startsAt));
}

export async function getEventAdmin(id: string) {
  const [e] = await db.select().from(event).where(eq(event.id, id));
  if (!e) return null;
  const responses = await db
    .select({
      memberName: member.fullName,
      /** e.g. "hurling,football" */
      codes: sql<string | null>`(select string_agg(ms.code, ',' order by ms.code) from membership ms where ms.member_id = ${member.id})`,
      dateOfBirth: member.dateOfBirth,
      response: eventResponse.response,
      updatedAt: eventResponse.updatedAt,
      contactName: user.name,
      contactEmail: user.email,
      contactPhone: user.phone,
    })
    .from(eventResponse)
    .innerJoin(member, eq(eventResponse.memberId, member.id))
    .innerJoin(user, eq(member.managedByUserId, user.id))
    .where(eq(eventResponse.eventId, id))
    .orderBy(asc(eventResponse.response), asc(member.fullName));
  return {
    event: e,
    responses: responses.map(({ codes: list, dateOfBirth, ...r }) => {
      const playing = list ? list.split(",") : [];
      return {
        ...r,
        codes: playing.map(codeLabel).join(" & "),
        team: playing.length ? teamFor({ dateOfBirth }) : null,
      };
    }),
  };
}

export async function saveEvent(actor: CurrentUser, input: EventInput & { id?: string }) {
  return db.transaction(async (tx) => {
    if (input.id) {
      const { id, ...values } = input;
      await tx.update(event).set(values).where(eq(event.id, id));
      await audit(tx, actor, "event.update", `Edited event "${input.title}"`);
      return id;
    }
    const slug = await uniqueSlug(input.title, async (s) =>
      Boolean((await tx.select({ id: event.id }).from(event).where(eq(event.slug, s))).length),
    );
    const [created] = await tx.insert(event).values({ ...input, slug }).returning();
    await audit(tx, actor, "event.create", `Created event "${input.title}" on ${formatLongDate(input.startsAt)}`);
    return created.id;
  });
}

/** Cancels or reinstates an event; on cancel, families who said "going" are emailed. */
export async function setEventCancelled(actor: CurrentUser, id: string, cancelled: boolean) {
  const e = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(event)
      .set({ status: cancelled ? "cancelled" : "scheduled" })
      .where(eq(event.id, id))
      .returning();
    if (updated) {
      await audit(tx, actor, cancelled ? "event.cancel" : "event.reinstate", `${cancelled ? "Cancelled" : "Reinstated"} "${updated.title}"`);
    }
    return updated;
  });
  if (!e || !cancelled) return;

  const recipients = await db
    .selectDistinct({ email: user.email, name: user.name })
    .from(eventResponse)
    .innerJoin(member, eq(eventResponse.memberId, member.id))
    .innerJoin(user, eq(member.managedByUserId, user.id))
    .where(sql`${eventResponse.eventId} = ${id} and ${eventResponse.response} = 'going'`);
  await Promise.all(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `Cancelled: ${e.title}`,
        text: `Hi ${r.name},\n\n${e.title} on ${formatLongDate(e.startsAt)} at ${formatTime(e.startsAt)} (${e.venue}) has been cancelled.\n\nSorry for any inconvenience — ${clubConfig.fullName}`,
      }),
    ),
  );
}

export async function deleteEvent(actor: CurrentUser, id: string) {
  await db.transaction(async (tx) => {
    const [e] = await tx.delete(event).where(eq(event.id, id)).returning();
    if (e) await audit(tx, actor, "event.delete", `Deleted event "${e.title}"`);
  });
}
