import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { codeLabel, codes, eventCategories } from "@/club.config";
import { FilterMenu } from "@/components/filter-menu";
import { PageBody, PageHeader } from "@/components/page-header";
import { CodeTag, buttonClass } from "@/components/ui";
import { formatDayMonth, formatTime, formatWeekday } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listEvents, listMyUpcomingEvents, type ClubEvent } from "@/server/events";
import { MyEventsList } from "./my-events";

export const metadata: Metadata = { title: "Events" };

const filters = [...codes.map((c) => ({ id: c.id, label: c.label })), { id: "social", label: "Social" }];

function EventFilter({ active }: { active?: string }) {
  return (
    <FilterMenu
      label="Filter events by code"
      heading="Show events for"
      all={{ label: "All codes", href: "/events" }}
      options={filters.map((f) => ({ ...f, href: `/events?code=${f.id}` }))}
      active={active}
    />
  );
}

function EventCard({ e, past }: { e: ClubEvent; past?: boolean }) {
  return (
    <article className="flex flex-col gap-3 rounded-card bg-surface p-5">
      {e.imageUrl && (
        <div className="relative h-38 overflow-hidden rounded-2xl">
          <Image src={e.imageUrl} unoptimized={!e.imageUrl.startsWith("/")} alt="" fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold tracking-wide text-white">
          {formatDayMonth(e.startsAt)}
        </span>
        <CodeTag code={e.category} />
        {e.status === "cancelled" && <span className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase">Cancelled</span>}
      </div>
      <h2 className="text-xl font-bold tracking-tight">{e.title}</h2>
      <p className="text-sm text-muted">
        {formatWeekday(e.startsAt)} · {formatTime(e.startsAt)}
        <br />
        {e.venue}
      </p>
      <Link href={`/events/${e.slug}`} className={buttonClass("secondary", "mt-auto w-full")}>
        {past ? "Read recap" : "View event"}
      </Link>
    </article>
  );
}

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const { code } = await searchParams;
  const category = typeof code === "string" && code in eventCategories ? code : undefined;
  const user = await requireUser();
  const [{ upcoming, past }, mine] = await Promise.all([listEvents(category), listMyUpcomingEvents(user.id)]);

  return (
    <>
      <PageHeader title="Events" action={<EventFilter active={category} />} />
      <PageBody>
        {!category && mine.length > 0 && (
          <section id="your-events" className="mb-10 max-w-2xl">
            <h2 className="mb-4 text-xl font-bold">Your upcoming events</h2>
            <MyEventsList items={mine} />
          </section>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">{category ? `${codeLabel(category)} events` : "All upcoming events"}</h2>
          {category && (
            <Link href="/events" className="text-sm font-semibold text-navy hover:underline">
              Show all codes
            </Link>
          )}
        </div>

        {upcoming.length === 0 && past.length === 0 && (
          <p className="rounded-card bg-surface p-8 text-center text-muted">No events match this filter yet.</p>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>

        {past.length > 0 && (
          <>
            <h2 className="mt-10 mb-4 text-xl font-bold">Past events</h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {past.map((e) => (
                <EventCard key={e.id} e={e} past />
              ))}
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
