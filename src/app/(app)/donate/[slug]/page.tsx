import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { codes } from "@/club.config";
import { PageBody, PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { Card, DetailRows, Tag } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { canPay } from "@/lib/rules/roles";
import { requireUser } from "@/lib/session";
import { getGoalBySlug } from "@/server/fundraising";
import { demoPaymentMethods } from "@/server/payments";
import { DonateFlow } from "../donate-flow";
import { GoalSummary } from "../goal-summary";

export const metadata: Metadata = { title: "Our next chapter" };

const statusLabel: Record<string, string> = {
  proposed: "Proposed goal",
  funded: "Funded",
  withdrawn: "Withdrawn",
};

export default async function GoalPage({ params }: PageProps<"/donate/[slug]">) {
  const { slug } = await params;
  const user = await requireUser();
  const goal = await getGoalBySlug(slug);
  if (!goal) notFound();

  const total = goal.breakdown.reduce((n, b) => n + b.amountCents, 0);
  const codeNames = codes.map((c) => c.label);

  return (
    <>
      <PageHeader
        title={goal.status === "active" ? "Our next chapter" : goal.title}
        backHref="/donate"
        action={
          <ShareButton
            title={goal.title}
            text={`Help Saints raise ${formatMoney(goal.targetCents)} for ${goal.title.toLowerCase()}.`}
          />
        }
      />
      <PageBody className="grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr]">
        <section>
          {goal.status === "active" ? (
            <GoalSummary goal={goal}>
              <DonateFlow
                goal={{ id: goal.id, title: goal.title }}
                methods={demoPaymentMethods.map((m) => ({ id: m.id, label: m.label, note: m.note }))}
                canDonate={canPay(user.roles)}
              />
            </GoalSummary>
          ) : (
            <Card className="flex flex-col gap-3">
              <div>
                <Tag>{statusLabel[goal.status] ?? goal.status}</Tag>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-navy">{goal.title}</h2>
              <p>{goal.purpose}</p>
              <p className="text-sm text-muted">Target {formatMoney(goal.targetCents)}</p>
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-6">
          {goal.headline && <h2 className="text-2xl font-bold tracking-tight">{goal.headline}</h2>}
          {(goal.description ?? goal.purpose).split("\n\n").map((para, i) => (
            <p key={i} className="max-w-md">
              {para}
            </p>
          ))}
          <div>
            <h3 className="text-xl font-bold">Who benefits</h3>
            <p className="mt-2 max-w-md">
              {codeNames.slice(0, -1).join(", ")} and {codeNames.at(-1)} all benefit from this goal.
            </p>
          </div>
          {goal.breakdown.length > 0 && (
            <Card className="flex flex-col gap-4">
              <h3 className="text-xl font-bold">Cost breakdown</h3>
              <DetailRows
                rows={[
                  ...goal.breakdown.map((b) => ({ label: b.label, value: formatMoney(b.amountCents) })),
                  { label: "Total", value: formatMoney(total) },
                ]}
              />
              <p className="text-xs text-muted">Illustrative estimates, not actual club spending.</p>
            </Card>
          )}
        </section>
      </PageBody>
    </>
  );
}
