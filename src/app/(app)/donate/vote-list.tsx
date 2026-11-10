"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { clearVoteAction, voteAction } from "./actions";

type Candidate = {
  id: string;
  slug: string;
  title: string;
  purpose: string | null;
  targetCents: number;
  votes: number;
};

type Step =
  | { kind: "confirm"; goal: Candidate }
  | { kind: "voted"; goal: Candidate }
  | { kind: "clear"; goal: Candidate }
  | { kind: "cleared" }
  | { kind: "closed"; error: string };

/* UC7 — Vote for next donation goal (Figma "Sheet / vote", "voted", "voteClosed"). */
export function VoteList({
  candidates,
  myVoteGoalId,
  canVote,
}: {
  candidates: Candidate[];
  myVoteGoalId: string | null;
  canVote: boolean;
}) {
  const [step, setStep] = useState<Step | null>(null);
  const totalVotes = candidates.reduce((n, c) => n + c.votes, 0);
  // Most votes first; ties keep the club's order (sort is stable).
  const ranked = [...candidates].sort((a, b) => b.votes - a.votes);
  const [pending, startTransition] = useTransition();

  function confirm(goal: Candidate) {
    startTransition(async () => {
      const result = await voteAction(goal.id);
      setStep(result.ok ? { kind: "voted", goal } : { kind: "closed", error: result.error });
    });
  }

  function clear() {
    startTransition(async () => {
      const result = await clearVoteAction();
      setStep(result.ok ? { kind: "cleared" } : { kind: "closed", error: result.error });
    });
  }

  return (
    <>
      <ol className="flex flex-col gap-4" aria-label="Proposed goals, most votes first">
        {ranked.map((c, i) => {
          const mine = c.id === myVoteGoalId;
          const share = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0;
          return (
            <li
              key={c.id}
              className={`flex items-center gap-4 rounded-card bg-surface p-5 ${mine ? "ring-2 ring-navy" : ""}`}
            >
              <span
                aria-label={`Rank ${i + 1}`}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-pale text-sm font-bold text-navy"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/donate/${c.slug}`} className="text-lg font-semibold hover:underline">
                  {c.title}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  Target {formatMoney(c.targetCents)}
                  {c.purpose && ` · ${c.purpose}`}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pale" aria-hidden>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
                  </div>
                  <p className="shrink-0 text-sm text-muted">
                    <span className="font-bold text-navy">{c.votes}</span> {c.votes === 1 ? "vote" : "votes"} · {share}%
                  </p>
                </div>
              </div>
              {mine ? (
                <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                  <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 text-sm font-semibold text-white">
                    <CheckIcon className="size-4" /> Your vote
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStep({ kind: "clear", goal: c })}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-muted underline-offset-2 hover:text-navy hover:underline disabled:opacity-50"
                  >
                    Remove vote
                  </button>
                </div>
              ) : (
                <Button
                  disabled={!canVote || pending}
                  onClick={() => setStep({ kind: "confirm", goal: c })}
                  size="sm"
                  className="shrink-0"
                >
                  Vote
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted">
        {totalVotes} {totalVotes === 1 ? "member has" : "members have"} voted in this round.
      </p>
      {!canVote && (
        <p className="mt-4 text-sm text-muted">Voting is open to players and family supporters.</p>
      )}

      <Sheet
        open={step?.kind === "confirm"}
        onClose={() => setStep(null)}
        title="Your next club goal"
      >
        <p className="text-sm text-muted">Confirm your choice</p>
        <p className="text-2xl font-bold text-navy">{step?.kind === "confirm" && step.goal.title}</p>
        <p className="text-sm text-muted">
          {myVoteGoalId ? "Your new choice replaces your previous vote. " : ""}
          Voting stays open until the current goal is funded.
        </p>
        <Button variant="primary" disabled={pending} onClick={() => step?.kind === "confirm" && confirm(step.goal)}>
          {pending ? "Saving…" : "Confirm vote"}
        </Button>
      </Sheet>

      <Sheet open={step?.kind === "voted"} onClose={() => setStep(null)} title="Vote saved">
        <p className="text-2xl font-bold text-navy">{step?.kind === "voted" && step.goal.title}</p>
        <p className="text-muted">Thanks for having your say. You can change your vote while this round is open.</p>
        <Button variant="primary" onClick={() => setStep(null)}>
          Done
        </Button>
      </Sheet>

      <Sheet open={step?.kind === "clear"} onClose={() => setStep(null)} title="Remove your vote?">
        <p className="text-2xl font-bold text-navy">{step?.kind === "clear" && step.goal.title}</p>
        <p className="text-sm text-muted">
          Your vote will be withdrawn without choosing another goal. You can vote again any time while this round is
          open.
        </p>
        <Button variant="primary" disabled={pending} onClick={clear}>
          {pending ? "Removing…" : "Remove my vote"}
        </Button>
        <Button onClick={() => setStep(null)}>Keep my vote</Button>
      </Sheet>

      <Sheet open={step?.kind === "cleared"} onClose={() => setStep(null)} title="Vote removed">
        <p className="text-muted">You haven&apos;t voted in this round. Pick a goal whenever you&apos;re ready.</p>
        <Button variant="primary" onClick={() => setStep(null)}>
          OK
        </Button>
      </Sheet>

      <Sheet open={step?.kind === "closed"} onClose={() => setStep(null)} title="Vote not saved">
        <p className="text-muted">{step?.kind === "closed" && step.error}</p>
        <Button variant="primary" onClick={() => setStep(null)}>
          See the latest goals
        </Button>
      </Sheet>
    </>
  );
}
