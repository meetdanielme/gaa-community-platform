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
import { PaidMembershipWarning } from "@/app/(app)/profile/paid-warning";

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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
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
              <div>
                <p className="font-semibold">
                  {m.fullName} <span className="font-normal text-muted">· {relationshipLabels[m.relationship]}</span>
                </p>
                <p className="text-sm text-muted">
                  {m.codes.length ? m.codes.map(codeLabel).join(" & ") : "Not playing · no fee"}
                  {m.team ? ` · ${m.team}` : ""}
                  {m.dateOfBirth ? ` · born ${formatLongDate(new Date(m.dateOfBirth))}` : ""}
                </p>
              </div>
              {m.fees.map(({ code, fee }) => (
                <div key={code} className="flex flex-col gap-2 rounded-xl bg-paper p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{codeLabel(code)}</span>
                    {fee ? (
                      <Pill tone={feeTone[fee.status as keyof typeof feeTone] ?? "grey"}>
                        {feeStatusLabels[fee.status]} · {formatMoney(fee.amountCents)}
                      </Pill>
                    ) : (
                      <Pill>No membership</Pill>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fee && fee.status !== "paid" && (
                      <form action={setFeeStatusAction.bind(null, fee.id, "paid")}>
                        <Button type="submit" size="sm">
                          Mark paid (cash/transfer)
                        </Button>
                      </form>
                    )}
                    {fee && fee.status !== "sponsored" && fee.status !== "paid" && (
                      <form action={setFeeStatusAction.bind(null, fee.id, "sponsored")}>
                        <Button type="submit" size="sm" variant="ghost">
                          Sponsor
                        </Button>
                      </form>
                    )}
                    {fee && fee.status !== "unpaid" && (
                      <form action={setFeeStatusAction.bind(null, fee.id, "unpaid")}>
                        <Button type="submit" size="sm" variant="ghost">
                          Mark unpaid
                        </Button>
                      </form>
                    )}
                    {!fee && (
                      <form action={createFeeAction.bind(null, m.id, code)}>
                        <Button type="submit" size="sm">
                          Add {clubConfig.season} membership
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              {m.cancelledFees.map((f) => (
                <p key={f.id} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  Cancelled {codeLabel(f.code)} membership · {feeStatusLabels[f.status]} {formatMoney(f.amountCents)} ·
                  review refund
                </p>
              ))}
              <div className="flex flex-wrap gap-2">
                <SheetButton label="Edit" title={`Edit ${m.fullName}`} size="sm" variant="ghost">
                  <MemberForm
                    member={m}
                    paidCodes={m.fees.filter((f) => f.fee?.status === "paid").map((f) => f.code)}
                    action={saveMemberForAccountAction}
                    hidden={{ userId: u.id }}
                  />
                </SheetButton>
                {m.relationship !== "self" && (
                  <ConfirmButton
                    label="Remove"
                    title={`Remove ${m.fullName}?`}
                    confirmLabel="Remove member"
                    cancelLabel="Keep member"
                    size="sm"
                    action={removeMemberForAccountAction.bind(null, u.id, m.id)}
                  >
                    <p>
                      {m.fullName} will be unlinked from {u.name}&apos;s account, with their responses and membership
                      record.
                    </p>
                    <PaidMembershipWarning member={m} />
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
