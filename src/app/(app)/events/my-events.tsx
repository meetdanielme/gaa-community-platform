import Link from "next/link";
import { CodeTag } from "@/components/ui";
import { formatDayMonth, formatTime, formatWeekday } from "@/lib/format";
import type { listMyUpcomingEvents } from "@/server/events";

/** "Your upcoming events": the events your family said it's going to. */
export function MyEventsList({
  items,
  inset = false,
}: {
  items: Awaited<ReturnType<typeof listMyUpcomingEvents>>;
  /** Inside a card: use the page colour so each row stands out. */
  inset?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ event: e, going }) => (
        <li key={e.id}>
          <Link
            href={`/events/${e.slug}`}
            className={`flex items-center gap-4 rounded-2xl p-4 transition hover:bg-pale ${inset ? "bg-paper" : "bg-surface"}`}
          >
            <span className="grid w-16 shrink-0 place-items-center rounded-xl bg-brand py-2 text-center text-xs font-bold tracking-wide text-white">
              {formatDayMonth(e.startsAt)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{e.title}</span>
              <span className="block text-sm text-muted">
                {formatWeekday(e.startsAt)} · {formatTime(e.startsAt)} · {e.venue}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                <CodeTag code={e.category} />
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Going: {going.join(", ")}
                </span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
