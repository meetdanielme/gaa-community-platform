import type { Metadata } from "next";
import { db } from "@/db";
import { goal } from "@/db/schema";
import { Select } from "@/components/form";
import { DownloadIcon } from "@/components/icons";
import { Button, buttonClass } from "@/components/ui";
import { formatLongDate, formatMoney } from "@/lib/format";
import { listDonations } from "@/server/admin/fundraising";
import { AdminPage, Pill, Stat, Table, Td } from "../ui";

export const metadata: Metadata = { title: "Donations" };

const statusTone = { succeeded: "green", declined: "red", pending: "amber" } as const;

export default async function AdminDonationsPage({ searchParams }: PageProps<"/admin/donations">) {
  const sp = await searchParams;
  const goalId = typeof sp.goal === "string" && sp.goal ? sp.goal : undefined;
  const status = typeof sp.status === "string" && sp.status ? sp.status : undefined;
  const [{ rows, totalCents, count }, goals] = await Promise.all([
    listDonations({ goalId, status }),
    db.select({ id: goal.id, title: goal.title }).from(goal),
  ]);
  const query = new URLSearchParams({ ...(goalId ? { goal: goalId } : {}), ...(status ? { status } : {}) });

  return (
    <AdminPage
      title="Donations"
      description="Every online donation attempt. Donor details are visible to club admins only."
      actions={
        <a href={`/admin/donations/export?${query}`} className={buttonClass("secondary", "", "sm")}>
          <DownloadIcon className="size-4" /> Export CSV
        </a>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Confirmed total" value={formatMoney(totalCents, { cents: totalCents % 100 !== 0 })} />
        <Stat label="Confirmed gifts" value={count} />
      </div>
      <form className="flex flex-wrap gap-2">
        <Select name="goal" defaultValue={goalId ?? ""} className="w-auto" aria-label="Goal">
          <option value="">All goals</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status ?? ""} className="w-auto" aria-label="Status">
          <option value="">Any status</option>
          <option value="succeeded">Confirmed</option>
          <option value="declined">Declined</option>
          <option value="pending">Pending</option>
        </Select>
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>
      <Table head={["Date", "Donor", "Goal", "Amount", "Status", "Receipt"]} empty="No donations match.">
        {rows.map((d) => (
          <tr key={d.id}>
            <Td className="whitespace-nowrap">{formatLongDate(d.createdAt)}</Td>
            <Td>
              {d.donorName ?? <span className="text-muted">Deleted account</span>}
              {d.donorEmail && <p className="text-xs text-muted">{d.donorEmail}</p>}
            </Td>
            <Td>{d.goalTitle}</Td>
            <Td className="font-semibold">{formatMoney(d.amountCents, { cents: d.amountCents % 100 !== 0 })}</Td>
            <Td>
              <Pill tone={statusTone[d.status as keyof typeof statusTone] ?? "grey"}>{d.status}</Pill>
            </Td>
            <Td className="text-xs text-muted">{d.receiptNumber ?? "—"}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
