import Link from "next/link";
import type { Metadata } from "next";
import { CodeTag, LinkButton } from "@/components/ui";
import { formatLongDate, formatTime } from "@/lib/format";
import { listEventsAdmin } from "@/server/admin/content";
import { AdminPage, Pill, Table, Td } from "../ui";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  const rows = await listEventsAdmin();
  const now = new Date();
  return (
    <AdminPage
      title="Events"
      actions={
        <LinkButton href="/admin/events/new" variant="primary" size="sm">
          New event
        </LinkButton>
      }
    >
      <Table head={["Event", "When", "Code", "Going", "Status"]} empty="No events yet.">
        {rows.map(({ event: e, going }) => (
          <tr key={e.id}>
            <Td>
              <Link href={`/admin/events/${e.id}`} className="font-semibold text-navy hover:underline">
                {e.title}
              </Link>
              <p className="text-xs text-muted">{e.venue}</p>
            </Td>
            <Td className="whitespace-nowrap">
              {formatLongDate(e.startsAt)}, {formatTime(e.startsAt)}
            </Td>
            <Td>
              <CodeTag code={e.category} />
            </Td>
            <Td>
              {going}
              {e.capacity ? ` / ${e.capacity}` : ""}
            </Td>
            <Td>
              {e.status === "cancelled" ? (
                <Pill tone="red">Cancelled</Pill>
              ) : e.startsAt < now ? (
                <Pill>Past</Pill>
              ) : (
                <Pill tone="green">Upcoming</Pill>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
