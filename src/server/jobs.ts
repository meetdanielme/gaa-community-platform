import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { event, eventReminder, user } from "@/db/schema";
import { clubConfig } from "@/club.config";
import { formatLongDate, formatTime } from "@/lib/format";
import { sendEmail } from "./email";
import { seedDatabase } from "./seed";

/**
 * Daily job (Vercel Cron, see vercel.json): emails reminders for events in
 * the next 24–48 hours, and resets the public demo when DEMO_MODE is on.
 */
export async function runDailyJobs(now = new Date()) {
  const from = new Date(now.getTime() + 24 * 3_600_000);
  const to = new Date(now.getTime() + 48 * 3_600_000);
  const due = await db
    .select({ email: user.email, name: user.name, event })
    .from(eventReminder)
    .innerJoin(event, eq(eventReminder.eventId, event.id))
    .innerJoin(user, eq(eventReminder.userId, user.id))
    .where(and(gte(event.startsAt, from), lt(event.startsAt, to), eq(event.status, "scheduled")));

  const results = await Promise.all(
    due.map((r) =>
      sendEmail({
        to: r.email,
        subject: `Tomorrow: ${r.event.title}`,
        text: `Hi ${r.name},\n\nA reminder that ${r.event.title} is on ${formatLongDate(r.event.startsAt)} at ${formatTime(r.event.startsAt)}, ${r.event.venue}.\n\n${r.event.goodToKnow ?? ""}\n\nSee you there — ${clubConfig.fullName}`,
      }),
    ),
  );

  const demoReset = clubConfig.demoMode ? await seedDatabase({ reset: true }) : false;
  return { remindersDue: due.length, remindersSent: results.filter(Boolean).length, demoReset };
}
