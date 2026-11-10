import { csvResponse } from "@/lib/csv";
import { listDonations } from "@/server/admin/fundraising";
import { isAdminRequest } from "@/server/admin/guard";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return new Response("Not found", { status: 404 });
  const sp = new URL(request.url).searchParams;
  const { rows } = await listDonations({ goalId: sp.get("goal") || undefined, status: sp.get("status") || undefined });
  return csvResponse(
    `donations-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Date", "Donor", "Email", "Goal", "Amount (EUR)", "Status", "Receipt"],
    rows.map((d) => [
      d.createdAt.toISOString(), d.donorName, d.donorEmail, d.goalTitle,
      (d.amountCents / 100).toFixed(2), d.status, d.receiptNumber,
    ]),
  );
}
