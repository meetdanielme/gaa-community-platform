import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clubConfig, codeLabel } from "@/club.config";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, CodeTag, DetailRows, LinkButton, Notice } from "@/components/ui";
import { formatLongDate, formatMoney } from "@/lib/format";
import { feeStatusLabels, relationshipLabels } from "@/lib/members";
import { canPay } from "@/lib/rules/roles";
import { cancellationNeedsAlert } from "@/lib/rules/membership";
import { requireUser } from "@/lib/session";
import { getManagedMember } from "@/server/profile";
import { demoPaymentMethods } from "@/server/payments";
import { ConfirmButton } from "@/components/confirm-button";
import { MemberForm } from "../../member-form";
import { removeMemberAction, saveMemberAction } from "../../actions";
import { SheetButton } from "@/components/sheet-button";
import { CancelMembershipButton, PayFeeButton } from "./member-actions";
import { PaidMembershipWarning } from "../../paid-warning";

export const metadata: Metadata = { title: "Member details" };

export default async function MemberPage({ params, searchParams }: PageProps<"/profile/members/[id]">) {
  const { id } = await params;
  const { added } = await searchParams;
  const user = await requireUser();
  // BR01: only profiles this account manages are visible.
  const m = await getManagedMember(user.id, id);
  if (!m) notFound();
  const isSelf = m.relationship === "self";
  const firstName = user.name.split(" ")[0];
  const methods = demoPaymentMethods.map((x) => ({ id: x.id, label: x.label, note: x.note }));
  const paidCodes = m.fees.filter((f) => f.fee && cancellationNeedsAlert(f.fee.status)).map((f) => f.code);

  return (
    <>
      <PageHeader title="Member details" backHref="/profile" />
      <PageBody className="flex max-w-4xl flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-navy">{m.fullName}</h2>
          <p className="mt-3 text-sm text-muted">
            {isSelf ? "Your member profile" : `Linked family member · ${relationshipLabels[m.relationship]}`}
          </p>
        </div>

        {added && (
          <Notice tone="success">
            {m.fullName} has been added
            {m.team ? (
              <>
                {" "}and placed in the <strong>{m.team}</strong> team for {clubConfig.season}, based on their date of
                birth.
              </>
            ) : (
              "."
            )}
          </Notice>
        )}

        <Card className="flex flex-col gap-4">
          <h3 className="text-xl font-bold">{clubConfig.season} season</h3>
          <DetailRows
            rows={[
              { label: "Date of birth", value: m.dateOfBirth ? formatLongDate(new Date(m.dateOfBirth)) : "Not added" },
              { label: "Team", value: m.team ?? (m.codes.length ? "Add a date of birth" : "Not playing") },
            ]}
          />
          {m.codes.length === 0 && <p className="text-sm text-muted">Not playing, so no membership fee is due.</p>}
        </Card>

        {m.fees.map(({ code, fee }) => (
          <Card key={code} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CodeTag code={code} />
              {m.team && <span className="text-sm font-semibold text-muted">{m.team}</span>}
            </div>
            <DetailRows
              rows={[
                { label: "Membership", value: fee ? feeStatusLabels[fee.status] : "Not set up yet" },
                ...(fee ? [{ label: "Fee", value: formatMoney(fee.amountCents) }] : []),
                ...(fee?.paymentRef ? [{ label: "Receipt", value: fee.paymentRef }] : []),
              ]}
            />
            {fee && (fee.status === "unpaid" || fee.status === "pending") && (
              <PayFeeButton
                feeId={fee.id}
                memberName={m.fullName}
                codeName={codeLabel(code)}
                amountCents={fee.amountCents}
                status={fee.status}
                canPay={canPay(user.roles)}
                methods={methods}
              />
            )}
            <CancelMembershipButton
              memberId={m.id}
              memberName={m.fullName}
              code={code}
              codeName={codeLabel(code)}
              paidAmount={fee && cancellationNeedsAlert(fee.status) ? formatMoney(fee.amountCents) : null}
            />
          </Card>
        ))}

        {m.cancelledFees.length > 0 && (
          <Card className="flex flex-col gap-2">
            <h3 className="font-bold">Cancelled memberships</h3>
            {m.cancelledFees.map((f) => (
              <p key={f.id} className="text-sm text-muted">
                {codeLabel(f.code)} · {feeStatusLabels[f.status]} {formatMoney(f.amountCents)} · the club treasurer has
                been alerted about a refund.
              </p>
            ))}
          </Card>
        )}

        <div>
          <p className="max-w-md text-muted">
            {isSelf
              ? "This is your own member profile. Keep your codes and date of birth up to date so you're in the right team."
              : `${firstName} manages this linked member profile and can respond to events and pay membership on their behalf.`}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <LinkButton href={m.codes.length === 1 ? `/events?code=${m.codes[0]}` : "/events"}>View club events</LinkButton>
          <SheetButton label="Edit member" title="Edit member">
            <MemberForm member={m} paidCodes={paidCodes} action={saveMemberAction} />
          </SheetButton>
          {!isSelf && (
            <ConfirmButton
              label="Remove from family"
              title="Remove member?"
              confirmLabel={`Remove ${m.fullName}`}
              cancelLabel={`Keep ${m.fullName}`}
              action={removeMemberAction.bind(null, m.id)}
            >
              <p>
                {m.fullName} will be unlinked from your account, along with their event responses and membership
                record.
              </p>
              {paidCodes.length > 0 && <PaidMembershipWarning member={m} />}
            </ConfirmButton>
          )}
        </div>
      </PageBody>
    </>
  );
}
