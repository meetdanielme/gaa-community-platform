import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { DownloadIcon } from "@/components/icons";
import { Card, CodeTag, DetailRows, Notice, buttonClass } from "@/components/ui";
import { formatLongDate, formatTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getEventDetail } from "@/server/events";
import { ReminderToggle, RespondButton } from "./event-actions";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const user = await requireUser();
  const detail = await getEventDetail(slug, user.id);
  if (!detail) notFound();

  const { event: e, attendees, goingCount, reminderOn } = detail;
  const isPast = e.startsAt <= new Date();
  const isCancelled = e.status === "cancelled";

  return (
    <>
      <PageHeader
        title={e.title}
        backHref="/events"
        action={<ShareButton title={e.title} text={`${e.title} — ${formatLongDate(e.startsAt)} at ${e.venue}.`} />}
      />
      <PageBody className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="flex flex-col gap-5">
          {e.imageUrl && (
            <div className="relative h-56 overflow-hidden rounded-3xl">
              <Image src={e.imageUrl} unoptimized={!e.imageUrl.startsWith("/")} alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
          )}
          <div>
            <CodeTag code={e.category} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{e.title}</h2>
          {isPast && e.recap && (
            <>
              <p className="text-lg">{e.recap}</p>
              <p className="text-sm text-muted">Photos and recap are illustrative sample content.</p>
            </>
          )}
        </section>

        <section className="flex flex-col gap-6">
          {isCancelled && <Notice tone="error">This event has been cancelled.</Notice>}
          <Card>
            <DetailRows
              rows={[
                { label: "Date", value: formatLongDate(e.startsAt) },
                { label: "Time", value: formatTime(e.startsAt) },
                { label: "Venue", value: e.venue },
                ...(e.capacity ? [{ label: "Going", value: `${goingCount} of ${e.capacity}` }] : []),
                ...(e.rsvpDeadline && !isPast
                  ? [{ label: "Respond by", value: `${formatLongDate(e.rsvpDeadline)}, ${formatTime(e.rsvpDeadline)}` }]
                  : []),
              ]}
            />
          </Card>

          <div>
            <h3 className="font-semibold">{e.headline}</h3>
            <p className="mt-3 max-w-md">{e.description}</p>
          </div>

          {e.schedule.length > 0 && (
            <div>
              <h3 className="mb-4 text-xl font-bold">On the day</h3>
              <Card>
                <DetailRows rows={e.schedule.map((s) => ({ label: s.time, value: s.label }))} />
              </Card>
            </div>
          )}

          {e.goodToKnow && (
            <div>
              <h3 className="text-xl font-bold">Good to know</h3>
              <p className="mt-3 max-w-md text-sm">{e.goodToKnow}</p>
            </div>
          )}

          {!isPast && !isCancelled && (
            <div className="flex flex-col gap-4">
              <RespondButton
                eventId={e.id}
                eventTitle={e.title}
                attendees={attendees.map((a) => ({
                  memberId: a.member.id,
                  name: a.member.fullName,
                  relationship: a.member.relationship,
                  response: a.response,
                }))}
              />
              <ReminderToggle eventId={e.id} eventTitle={e.title} on={reminderOn} />
              <a href={`/events/${e.slug}/calendar`} className={buttonClass("ghost")}>
                <DownloadIcon className="size-5" /> Add to calendar
              </a>
            </div>
          )}

        </section>
      </PageBody>
    </>
  );
}
