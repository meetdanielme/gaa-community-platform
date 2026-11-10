import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { codeLabel, codes, eventCategories } from "@/club.config";
import { FilterIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { CodeTag, buttonClass } from "@/components/ui";
import { formatDayMonth, formatTime, formatWeekday } from "@/lib/format";
import { listEvents, type ClubEvent } from "@/server/events";

export const metadata: Metadata = { title: "Events" };

const filters = [...codes.map((c) => ({ id: c.id, label: c.label })), { id: "social", label: "Social" }];

function EventFilter({ active }: { active?: string }) {
  return (
    <details className="relative">
      <summary
        aria-label="Filter events by code"
        className="grid size-11 cursor-pointer list-none place-items-center rounded-full bg-white text-navy shadow-md hover:bg-paper [&::-webkit-details-marker]:hidden"
      >
        <FilterIcon />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-3xl bg-white p-3 shadow-xl">
        <p className="px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">Show events for</p>
        <Link
          href="/events"
          className={`block rounded-xl px-3 py-2.5 font-medium hover:bg-paper ${!active ? "bg-pale text-navy" : ""}`}
        >
          All codes
        </Link>
        {filters.map((f) => (
          <Link
            key={f.id}
            href={`/events?code=${f.id}`}
            className={`block rounded-xl px-3 py-2.5 font-medium hover:bg-paper ${active === f.id ? "bg-pale text-navy" : ""}`}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function EventCard({ e, past }: { e: ClubEvent; past?: boolean }) {
  return (
    <article className="flex flex-col gap-3 rounded-card bg-white p-5">
      {e.imageUrl && (
        <div className="relative h-38 overflow-hidden rounded-2xl">
          <Image src={e.imageUrl} unoptimized={!e.imageUrl.startsWith("/")} alt="" fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-navy px-2.5 py-1 text-xs font-bold tracking-wide text-white">
          {formatDayMonth(e.startsAt)}
        </span>
        <CodeTag code={e.category} />
        {e.status === "cancelled" && <span className="text-xs font-semibold text-red-700 uppercase">Cancelled</span>}
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
  const { upcoming, past } = await listEvents(category);

  return (
    <>
      <PageHeader title="Events" action={<EventFilter active={category} />} />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">{category ? `${codeLabel(category)} events` : "Upcoming events"}</h2>
          {category && (
            <Link href="/events" className="text-sm font-semibold text-navy hover:underline">
              Show all codes
            </Link>
          )}
        </div>

        {upcoming.length === 0 && past.length === 0 && (
          <p className="rounded-card bg-white p-8 text-center text-muted">No events match this filter yet.</p>
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
