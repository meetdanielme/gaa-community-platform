import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ConfirmButton } from "@/components/confirm-button";
import { DownloadIcon } from "@/components/icons";
import { Notice, buttonClass } from "@/components/ui";
import { toClubLocalInput } from "@/lib/datetime";
import { formatRelative } from "@/lib/format";
import { getEventAdmin } from "@/server/admin/content";
import { AdminPage, Pill, Table, Td } from "../../ui";
import { deleteEventAction, setEventCancelledAction } from "../actions";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  const detail = await getEventAdmin(id);
  if (!detail) notFound();
  const { event: e, responses } = detail;
  const going = responses.filter((r) => r.response === "going");
  const cancelled = e.status === "cancelled";

  return (
    <AdminPage
      title={e.title}
      back={{ href: "/admin/events", label: "Events" }}
      description={
        <Link href={`/events/${e.slug}`} className="font-semibold text-navy hover:underline">
          View as members see it →
        </Link>
      }
      actions={
        <>
          <ConfirmButton
            label={cancelled ? "Reinstate event" : "Cancel event"}
            title={cancelled ? "Reinstate this event?" : "Cancel this event?"}
            confirmLabel={cancelled ? "Reinstate" : "Cancel event"}
            destructive={!cancelled}
            variant="secondary"
            size="sm"
            action={setEventCancelledAction.bind(null, e.id, !cancelled)}
          >
            {cancelled
              ? "Members will be able to respond again."
              : `Members will see it as cancelled, and the ${going.length} ${going.length === 1 ? "family who said" : "families who said"} they were going will be emailed (when email is set up).`}
          </ConfirmButton>
          <ConfirmButton
            label="Delete"
            title="Delete this event?"
            confirmLabel="Delete permanently"
            size="sm"
            action={deleteEventAction.bind(null, e.id)}
          >
            This removes the event and all {responses.length} responses. Consider cancelling instead so members are
            told.
          </ConfirmButton>
        </>
      }
    >
      {cancelled && <Notice tone="error">This event is cancelled.</Notice>}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            Responses · {going.length} going{e.capacity ? ` of ${e.capacity}` : ""}
          </h2>
          {responses.length > 0 && (
            <a href={`/admin/events/${e.id}/attendees`} className={buttonClass("secondary", "", "sm")}>
              <DownloadIcon className="size-4" /> Export CSV
            </a>
          )}
        </div>
        <Table head={["Member", "Team", "Response", "Contact", "Updated"]} empty="No responses yet.">
          {responses.map((r, i) => (
            <tr key={i}>
              <Td className="font-semibold">{r.memberName}</Td>
              <Td>{[r.code, r.team].filter(Boolean).join(" · ") || "—"}</Td>
              <Td>{r.response === "going" ? <Pill tone="green">Going</Pill> : <Pill>Not going</Pill>}</Td>
              <Td>
                {r.contactName}
                <p className="text-xs text-muted">{r.contactEmail}</p>
              </Td>
              <Td className="text-xs whitespace-nowrap text-muted">{formatRelative(r.updatedAt)}</Td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Details</h2>
        <EventForm
          event={{
            ...e,
            startsAtLocal: toClubLocalInput(e.startsAt),
            rsvpDeadlineLocal: toClubLocalInput(e.rsvpDeadline),
          }}
        />
      </section>
    </AdminPage>
  );
}
