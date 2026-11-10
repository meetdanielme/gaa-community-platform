import Link from "next/link";
import type { Metadata } from "next";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, LinkButton, Notice, ProgressBar } from "@/components/ui";
import { formatLongDate, formatMoney } from "@/lib/format";
import { listGoalsAdmin } from "@/server/admin/fundraising";
import { AdminPage, Pill, Table, Td } from "../ui";
import { activateGoalAction, setGoalWithdrawnAction } from "./actions";
import { OfflineFundsForm } from "./goal-form";

export const metadata: Metadata = { title: "Fundraising" };

export default async function AdminGoalsPage() {
  const { goals, round, pendingDecision } = await listGoalsAdmin();
  const active = goals.find((g) => g.status === "active");
  const proposed = goals.filter((g) => g.status === "proposed").sort((a, b) => b.votes - a.votes);
  const past = goals.filter((g) => g.status === "funded" || g.status === "withdrawn").reverse();

  return (
    <AdminPage
      title="Fundraising"
      description="One goal is funded at a time. Members vote on which proposal comes next; the top vote becomes active automatically when the current goal is funded."
      actions={
        <LinkButton href="/admin/goals/new" variant="primary" size="sm">
          Propose a goal
        </LinkButton>
      }
    >
      {pendingDecision && !active && (
        <Notice tone="error">
          The vote for the next goal was tied, so donations are paused. Choose which proposal becomes the next goal —
          your decision is recorded in the activity log for members&apos; transparency.
        </Notice>
      )}

      {active ? (
        <Card className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Pill tone="green">Active goal</Pill>
            <Link href={`/admin/goals/${active.id}`} className="text-2xl font-bold text-navy hover:underline">
              {active.title}
            </Link>
            <p className="text-sm">
              {formatMoney(active.raisedCents)} of {formatMoney(active.targetCents)}
              {active.offlineRaisedCents > 0 && (
                <span className="text-muted"> · {formatMoney(active.offlineRaisedCents)} raised offline</span>
              )}
            </p>
            <ProgressBar value={active.raisedCents} max={active.targetCents} />
            {active.activatedAt && <p className="text-xs text-muted">Active since {formatLongDate(active.activatedAt)}</p>}
          </div>
          <div>
            <h2 className="mb-2 font-bold">Money raised outside the app</h2>
            <OfflineFundsForm goalId={active.id} />
          </div>
        </Card>
      ) : (
        !pendingDecision && (
          <Notice>No goal is active. Activate a proposal below to start fundraising.</Notice>
        )
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">On the ballot {round ? "· voting open" : "· voting closed"}</h2>
        <Table head={["Proposal", "Target", "Votes", ""]} empty="No proposals. Members can't vote until you propose one.">
          {proposed.map((g) => (
            <tr key={g.id}>
              <Td>
                <Link href={`/admin/goals/${g.id}`} className="font-semibold text-navy hover:underline">
                  {g.title}
                </Link>
                <p className="text-xs text-muted">{g.purpose}</p>
              </Td>
              <Td>{formatMoney(g.targetCents)}</Td>
              <Td className="font-bold">{g.votes}</Td>
              <Td>
                <div className="flex justify-end gap-2">
                  {!active && (
                    <ConfirmButton
                      label={pendingDecision ? "Choose as next goal" : "Activate"}
                      title={`Make "${g.title}" the active goal?`}
                      confirmLabel="Activate goal"
                      destructive={false}
                      variant="primary"
                      size="sm"
                      action={activateGoalAction.bind(null, g.id)}
                    >
                      Donations will go to this goal and a new voting round opens for the remaining proposals.
                    </ConfirmButton>
                  )}
                  <ConfirmButton
                    label="Withdraw"
                    title={`Withdraw "${g.title}"?`}
                    confirmLabel="Withdraw from ballot"
                    size="sm"
                    action={setGoalWithdrawnAction.bind(null, g.id, true)}
                  >
                    It will no longer appear on the ballot and its votes stop counting. You can restore it later.
                  </ConfirmButton>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">History</h2>
          <Table head={["Goal", "Target", "Status", ""]}>
            {past.map((g) => (
              <tr key={g.id}>
                <Td className="font-semibold">{g.title}</Td>
                <Td>{formatMoney(g.targetCents)}</Td>
                <Td>
                  {g.status === "funded" ? (
                    <Pill tone="green">Funded {g.fundedAt ? formatLongDate(g.fundedAt) : ""}</Pill>
                  ) : (
                    <Pill>Withdrawn</Pill>
                  )}
                </Td>
                <Td>
                  {g.status === "withdrawn" && (
                    <ConfirmButton
                      label="Restore"
                      title={`Restore "${g.title}" to the ballot?`}
                      confirmLabel="Restore"
                      destructive={false}
                      variant="secondary"
                      size="sm"
                      action={setGoalWithdrawnAction.bind(null, g.id, false)}
                    >
                      Members will be able to vote for it again.
                    </ConfirmButton>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </AdminPage>
  );
}
