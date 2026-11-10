import type { ReactNode } from "react";
import { Card, ProgressBar, Tag } from "@/components/ui";
import { formatMoney } from "@/lib/format";

/** The current goal card: Figma "OUR SHARED FUTURE" block. */
export function GoalSummary({
  goal,
  children,
}: {
  goal: { title: string; purpose: string; raisedCents: number; targetCents: number };
  children?: ReactNode;
}) {
  const remaining = Math.max(0, goal.targetCents - goal.raisedCents);
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Tag>Our shared future</Tag>
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-navy">{goal.title}</h2>
      <p>{goal.purpose}</p>
      <p className="flex items-baseline gap-4">
        <span className="text-3xl font-bold text-navy">{formatMoney(goal.raisedCents)}</span>
        <span className="text-sm text-muted">of {formatMoney(goal.targetCents)}</span>
      </p>
      <ProgressBar value={goal.raisedCents} max={goal.targetCents} />
      <p className="text-xs text-muted">
        {remaining > 0 ? `${formatMoney(remaining)} still to raise` : "Fully funded — thank you!"}
      </p>
      {children}
    </Card>
  );
}
