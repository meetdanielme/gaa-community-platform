import Link from "next/link";
import { clubConfig } from "@/club.config";
import { LinkButton, Notice, ProgressBar } from "@/components/ui";
import { formatMoney, formatRelative } from "@/lib/format";
import { getDashboard } from "@/server/admin/dashboard";
import { AdminPage, Stat } from "./ui";

export default async function AdminDashboard() {
  const d = await getDashboard();
  return (
    <AdminPage
      title="Dashboard"
      description={`${clubConfig.fullName} · ${clubConfig.season} season`}
      actions={
        <>
          <LinkButton href="/admin/posts/new" size="sm">
            New post
          </LinkButton>
          <LinkButton href="/admin/events/new" size="sm" variant="primary">
            New event
          </LinkButton>
        </>
      }
    >
      {d.selectionPending && (
        <Notice tone="error">
          The last goal is funded but the vote for the next one was tied.{" "}
          <Link href="/admin/goals" className="font-semibold underline">
            Choose the next goal
          </Link>{" "}
          to reopen donations.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accounts" value={d.accounts} sub={`${d.members} people incl. family members`} />
        <Stat
          label="Membership collected"
          value={formatMoney(Number(d.fees.paid.cents))}
          sub={`${d.fees.paid.n} paid · ${d.fees.sponsored.n} sponsored`}
        />
        <Stat
          label="Membership outstanding"
          value={formatMoney(d.fees.outstanding.cents)}
          sub={`${d.fees.outstanding.n} members`}
        />
        <Stat label="Donations" value={formatMoney(d.donations.cents)} sub={`${d.donations.n} confirmed donations`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="flex flex-col gap-4 rounded-card bg-surface p-5">
          <h2 className="text-lg font-bold">Current goal</h2>
          {d.activeGoal ? (
            <>
              <p className="text-2xl font-bold text-navy">{d.activeGoal.title}</p>
              <p className="text-sm">
                {formatMoney(d.activeGoal.raisedCents)} of {formatMoney(d.activeGoal.targetCents)}
              </p>
              <ProgressBar value={d.activeGoal.raisedCents} max={d.activeGoal.targetCents} />
              <LinkButton href="/admin/goals" size="sm">
                Manage fundraising
              </LinkButton>
            </>
          ) : (
            <p className="text-muted">No active goal.</p>
          )}
          <p className="text-sm text-muted">{d.upcomingEvents} upcoming events.</p>
        </section>

        <section className="rounded-card bg-surface p-5">
          <h2 className="text-lg font-bold">Recent admin activity</h2>
          {d.activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-paper text-sm">
              {d.activity.map((a) => (
                <li key={a.id} className="flex justify-between gap-4 py-2.5">
                  <span>
                    <span className="font-semibold">{a.actorName}</span> · {a.summary}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{formatRelative(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminPage>
  );
}
