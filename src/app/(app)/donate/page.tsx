import Link from "next/link";
import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, buttonClass } from "@/components/ui";
import { canPay, canVote } from "@/lib/rules/roles";
import { requireUser } from "@/lib/session";
import { getFundraisingOverview, getLatestProgression } from "@/server/fundraising";
import { demoPaymentMethods } from "@/server/payments";
import { GoalSummary } from "./goal-summary";
import { DonateFlow } from "./donate-flow";
import { VoteList } from "./vote-list";

export const metadata: Metadata = { title: "Donate" };

export default async function DonatePage() {
  const user = await requireUser();
  const overview = await getFundraisingOverview(user.id);
  const myChoice = overview.candidates.find((c) => c.goal.id === overview.myVoteGoalId);
  const progression = overview.active ? null : await getLatestProgression();

  return (
    <>
      <PageHeader title="Donate" />
      <PageBody className="grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr]">
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">Current donation goal</h2>

          {overview.active ? (
            <GoalSummary goal={overview.active}>
              <DonateFlow
                goal={{ id: overview.active.id, title: overview.active.title }}
                methods={demoPaymentMethods.map((m) => ({ id: m.id, label: m.label, note: m.note }))}
                canDonate={canPay(user.roles)}
              />
              <Link href={`/donate/${overview.active.slug}`} className={buttonClass("secondary")}>
                See the impact
              </Link>
            </GoalSummary>
          ) : overview.selectionPending ? (
            <Card className="flex flex-col gap-3">
              <p className="text-xl font-bold text-navy">Selection pending</p>
              <p className="text-sm text-muted">
                {progression?.funded.title ?? "The last goal"} is fully funded — thank you! The vote for the next goal
                was tied, so the club committee will publish a decision soon.
              </p>
            </Card>
          ) : (
            <Card className="flex flex-col gap-3">
              <p className="text-xl font-bold text-navy">No fundraising goal yet</p>
              <p className="text-sm text-muted">
                The club hasn&apos;t opened a fundraising goal yet. Proposals will appear here for you to vote on.
              </p>
            </Card>
          )}

          <Card className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted">Your choice</p>
            <p className="text-lg font-semibold text-navy">{myChoice ? myChoice.goal.title : "No vote yet"}</p>
            <p className="text-xs text-muted">
              The highest-voted proposal follows the current goal when it is fully funded.
            </p>
          </Card>
        </section>

        <section>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Vote for next goal</h2>
            {overview.round && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Voting open</span>
            )}
          </div>
          {overview.round ? (
            <VoteList
              candidates={overview.candidates.map((c) => ({
                id: c.goal.id,
                slug: c.goal.slug,
                title: c.goal.title,
                purpose: c.goal.purpose,
                targetCents: c.goal.targetCents,
                votes: c.votes,
              }))}
              myVoteGoalId={overview.myVoteGoalId}
              canVote={canVote(user.roles)}
            />
          ) : (
            <Card>
              <p className="text-muted">Voting is closed while the club confirms the next goal.</p>
            </Card>
          )}
        </section>
      </PageBody>
    </>
  );
}
