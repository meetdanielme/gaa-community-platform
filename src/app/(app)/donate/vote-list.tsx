"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { voteAction } from "./actions";

type Candidate = {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  targetCents: number;
  votes: number;
};

type Step = { kind: "confirm"; goal: Candidate } | { kind: "voted"; goal: Candidate } | { kind: "closed"; error: string };

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
  const [pending, startTransition] = useTransition();

  function confirm(goal: Candidate) {
    startTransition(async () => {
      const result = await voteAction(goal.id);
      setStep(result.ok ? { kind: "voted", goal } : { kind: "closed", error: result.error });
    });
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {candidates.map((c) => {
          const mine = c.id === myVoteGoalId;
          const share = totalVotes ? Math.round((c.votes / totalVotes) * 100) : 0;
          return (
            <li
              key={c.id}
              className={`flex items-center gap-4 rounded-card bg-white p-5 ${mine ? "ring-2 ring-navy" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <Link href={`/donate/${c.slug}`} className="text-lg font-semibold hover:underline">
                  {c.title}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  Target {formatMoney(c.targetCents)} · {c.purpose}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pale" aria-hidden>
                    <div className="h-full rounded-full bg-navy" style={{ width: `${share}%` }} />
                  </div>
                  <p className="shrink-0 text-sm text-muted">
                    <span className="font-bold text-navy">{c.votes}</span> {c.votes === 1 ? "vote" : "votes"} · {share}%
                  </p>
                </div>
              </div>
              {mine ? (
                <span className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-navy px-4 text-sm font-semibold text-white">
                  <CheckIcon className="size-4" /> Your vote
                </span>
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
      </ul>
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
          {myVoteGoalId
            ? "Your new choice replaces your previous vote. "
            : ""}
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

      <Sheet open={step?.kind === "closed"} onClose={() => setStep(null)} title="Vote not saved">
        <p className="text-muted">{step?.kind === "closed" && step.error}</p>
        <Button variant="primary" onClick={() => setStep(null)}>
          See the latest goals
        </Button>
      </Sheet>
    </>
  );
}
