import { eq } from "drizzle-orm";
import { db } from "@/db";
import { event } from "@/db/schema";
import { clubConfig } from "@/club.config";
import { getSession } from "@/lib/session";

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Downloads an event as an .ics file for Apple/Google/Outlook calendars. */
export async function GET(request: Request, { params }: RouteContext<"/events/[slug]/calendar">) {
  if (!(await getSession())) return new Response("Sign in to add club events to your calendar.", { status: 401 });
  const { slug } = await params;
  const [e] = await db.select().from(event).where(eq(event.slug, slug));
  if (!e) return new Response("Not found", { status: 404 });

  // Schedules aren't stored with an end time; assume three hours.
  const end = new Date(e.startsAt.getTime() + 3 * 3_600_000);
  const url = new URL(`/events/${e.slug}`, request.url).toString();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${clubConfig.fullName}//Community Platform//EN`,
    "BEGIN:VEVENT",
    `UID:${e.id}@${new URL(request.url).host}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escape(e.title)}`,
    `LOCATION:${escape(e.venue)}`,
    `DESCRIPTION:${escape([e.headline, e.description, url].filter(Boolean).join("\n\n"))}`,
    `URL:${url}`,
    e.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
    },
  });
}
