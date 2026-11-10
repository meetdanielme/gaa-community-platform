import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clubConfig, codeLabel } from "@/club.config";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, DetailRows, LinkButton } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { feeStatusLabels, relationshipLabels } from "@/lib/members";
import { canPay } from "@/lib/rules/roles";
import { requireUser } from "@/lib/session";
import { getManagedMember } from "@/server/profile";
import { demoPaymentMethods } from "@/server/payments";
import { PayFeeButton } from "./member-actions";

export const metadata: Metadata = { title: "Member details" };

export default async function MemberPage({ params }: PageProps<"/profile/members/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  // BR01: only profiles this account manages are visible.
  const m = await getManagedMember(user.id, id);
  if (!m) notFound();
  const isSelf = m.relationship === "self";
  const firstName = user.name.split(" ")[0];

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

        <Card className="flex flex-col gap-4">
          <h3 className="text-xl font-bold">{clubConfig.season} season</h3>
          <DetailRows
            rows={[
              { label: "Code", value: m.code ? codeLabel(m.code) : "Not playing" },
              { label: "Team", value: m.team ?? "—" },
              { label: "Status", value: m.fee ? feeStatusLabels[m.fee.status] : "No membership record" },
              ...(m.fee ? [{ label: "Membership fee", value: formatMoney(m.fee.amountCents) }] : []),
              ...(m.fee?.paymentRef ? [{ label: "Receipt", value: m.fee.paymentRef }] : []),
            ]}
          />
          {m.fee && (m.fee.status === "unpaid" || m.fee.status === "pending") && (
            <PayFeeButton
              feeId={m.fee.id}
              memberName={m.fullName}
              amountCents={m.fee.amountCents}
              status={m.fee.status}
              canPay={canPay(user.roles)}
              methods={demoPaymentMethods.map((x) => ({ id: x.id, label: x.label, note: x.note }))}
            />
          )}
        </Card>

        <div>
          <h3 className="text-xl font-bold">A family, connected</h3>
          <p className="mt-3 max-w-md">
            {isSelf
              ? "This is your own member profile. Contact the club to update team or membership records."
              : `${firstName} manages this linked member profile. Contact the club to update team or membership records.`}
          </p>
        </div>

        <LinkButton href={m.code ? `/events?code=${m.code}` : "/events"}>View club events</LinkButton>
      </PageBody>
    </>
  );
}
