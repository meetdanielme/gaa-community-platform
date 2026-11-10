import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clubConfig, codeLabel } from "@/club.config";
import { ConfirmButton } from "@/components/confirm-button";
import { SheetButton } from "@/components/sheet-button";
import { Button, Card, DetailRows } from "@/components/ui";
import { formatLongDate, formatMoney } from "@/lib/format";
import { feeStatusLabels, relationshipLabels } from "@/lib/members";
import { parseRoles } from "@/lib/rules/roles";
import { requireAdmin } from "@/lib/session";
import { getAccount } from "@/server/admin/members";
import { MemberForm } from "@/app/(app)/profile/member-form";
import { AdminPage, Pill } from "../../ui";
import {
  createFeeAction,
  removeMemberForAccountAction,
  saveMemberForAccountAction,
  setFeeStatusAction,
} from "../actions";
import { AccessForm } from "./access-form";

export const metadata: Metadata = { title: "Member account" };

const feeTone = { paid: "green", sponsored: "navy", unpaid: "amber", pending: "amber" } as const;

export default async function AdminAccountPage({ params }: PageProps<"/admin/members/[id]">) {
  const { id } = await params;
  const admin = await requireAdmin();
  const account = await getAccount(id);
  if (!account) notFound();
  const { user: u, members } = account;

  return (
    <AdminPage title={u.name} description={u.email} back={{ href: "/admin/members", label: "Members" }}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="font-bold">Contact</h2>
            <DetailRows
              rows={[
                { label: "Email", value: u.email },
                { label: "Phone", value: u.phone ?? "—" },
                { label: "Eircode", value: u.eircode ?? "—" },
                { label: "Joined", value: formatLongDate(u.createdAt) },
              ]}
            />
          </Card>
          <Card>
            <AccessForm userId={u.id} roles={parseRoles(u.roles)} isAdmin={u.isAdmin} isSelf={u.id === admin.id} />
          </Card>
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Family · {clubConfig.season}</h2>
            <SheetButton label="Add family member" title="Add family member" size="sm">
              <MemberForm action={saveMemberForAccountAction} hidden={{ userId: u.id }} />
            </SheetButton>
          </div>
          {members.map((m) => (
            <Card key={m.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {m.fullName} <span className="font-normal text-muted">· {relationshipLabels[m.relationship]}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {m.code ? codeLabel(m.code) : "Not playing"}
                    {m.team ? ` · ${m.team}` : ""}
                  </p>
                </div>
                {m.fee ? (
                  <Pill tone={feeTone[m.fee.status as keyof typeof feeTone] ?? "grey"}>
                    {feeStatusLabels[m.fee.status]} · {formatMoney(m.fee.amountCents)}
                  </Pill>
                ) : (
                  <Pill>{m.code ? "No membership" : "Not playing · no fee"}</Pill>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {m.fee && m.fee.status !== "paid" && (
                  <form action={setFeeStatusAction.bind(null, m.fee.id, "paid")}>
                    <Button type="submit" size="sm">
                      Mark paid (cash/transfer)
                    </Button>
                  </form>
                )}
                {m.fee && m.fee.status !== "sponsored" && m.fee.status !== "paid" && (
                  <form action={setFeeStatusAction.bind(null, m.fee.id, "sponsored")}>
                    <Button type="submit" size="sm" variant="ghost">
                      Sponsor
                    </Button>
                  </form>
                )}
                {m.fee && m.fee.status !== "unpaid" && (
                  <form action={setFeeStatusAction.bind(null, m.fee.id, "unpaid")}>
                    <Button type="submit" size="sm" variant="ghost">
                      Mark unpaid
                    </Button>
                  </form>
                )}
                {!m.fee && m.code && (
                  <form action={createFeeAction.bind(null, m.id)}>
                    <Button type="submit" size="sm">
                      Add {clubConfig.season} membership
                    </Button>
                  </form>
                )}
                <SheetButton label="Edit" title={`Edit ${m.fullName}`} size="sm" variant="ghost">
                  <MemberForm member={m} action={saveMemberForAccountAction} hidden={{ userId: u.id }} />
                </SheetButton>
                {m.relationship !== "self" && (
                  <ConfirmButton
                    label="Remove"
                    title={`Remove ${m.fullName}?`}
                    confirmLabel="Remove member"
                    size="sm"
                    action={removeMemberForAccountAction.bind(null, u.id, m.id)}
                  >
                    {m.fullName} will be unlinked from {u.name}&apos;s account, with their responses and membership record.
                  </ConfirmButton>
                )}
              </div>
            </Card>
          ))}
        </section>
      </div>
    </AdminPage>
  );
}
