import Link from "next/link";
import type { Metadata } from "next";
import { Input } from "@/components/form";
import { Button } from "@/components/ui";
import { formatLongDate } from "@/lib/format";
import { parseRoles, roleLabels } from "@/lib/rules/roles";
import { listAccounts } from "@/server/admin/members";
import { AdminPage, Pill, Table, Td } from "../ui";

export const metadata: Metadata = { title: "Members" };

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const accounts = await listAccounts(query);

  return (
    <AdminPage title="Members" description="Accounts and the family members each one manages.">
      <form className="flex max-w-lg gap-2" role="search">
        <Input name="q" defaultValue={query} placeholder="Search by name or email" aria-label="Search members" />
        <Button type="submit" size="sm" className="shrink-0">
          Search
        </Button>
      </form>
      <Table head={["Name", "Roles", "Family", "Membership", "Joined"]} empty="No accounts match.">
        {accounts.map((a) => (
          <tr key={a.id}>
            <Td>
              <Link href={`/admin/members/${a.id}`} className="font-semibold text-navy hover:underline">
                {a.name}
              </Link>
              <p className="text-xs text-muted">{a.email}</p>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {a.isAdmin && <Pill tone="navy">Admin</Pill>}
                {parseRoles(a.roles).map((r) => (
                  <Pill key={r}>{roleLabels[r]}</Pill>
                ))}
              </div>
            </Td>
            <Td>{Number(a.familySize)}</Td>
            <Td>{Number(a.outstanding) > 0 ? <Pill tone="amber">{a.outstanding} due</Pill> : <Pill tone="green">Up to date</Pill>}</Td>
            <Td className="whitespace-nowrap">{formatLongDate(a.createdAt)}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
