import { csvResponse } from "@/lib/csv";
import { getEventAdmin } from "@/server/admin/content";
import { isAdminRequest } from "@/server/admin/guard";

export async function GET(_: Request, { params }: RouteContext<"/admin/events/[id]/attendees">) {
  if (!(await isAdminRequest())) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const detail = await getEventAdmin(id);
  if (!detail) return new Response("Not found", { status: 404 });
  return csvResponse(
    `${detail.event.slug}-responses.csv`,
    ["Member", "Code", "Team", "Response", "Contact", "Email", "Phone", "Updated"],
    detail.responses.map((r) => [
      r.memberName, r.code, r.team, r.response === "going" ? "Going" : "Not going",
      r.contactName, r.contactEmail, r.contactPhone, r.updatedAt.toISOString(),
    ]),
  );
}
