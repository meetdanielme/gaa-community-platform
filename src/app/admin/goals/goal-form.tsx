"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useState } from "react";
import { Field, Input } from "@/components/form";
import { Textarea } from "@/components/textarea";
import { limits } from "@/lib/limits";
import { formatMoney, parseEuros } from "@/lib/format";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { Button, Card, Notice } from "@/components/ui";
import { recordOfflineFundsAction, saveGoalAction } from "./actions";

type GoalValues = {
  id: string;
  title: string;
  purpose: string | null;
  headline: string | null;
  description: string | null;
  targetCents: number;
  breakdown: { label: string; amountCents: number }[];
};

const euro = (cents: number) => String(cents / 100);

export function GoalForm({ goal }: { goal?: GoalValues }) {
  const [state, onSubmit, pending] = useFormAction(saveGoalAction);
  const err = state?.errors ?? {};
  const initial = goal?.breakdown.length ? goal.breakdown : [{ label: "", amountCents: 0 }];
  const [rows, setRows] = useState(initial.map((r, key) => ({ label: r.label, amount: r.amountCents ? euro(r.amountCents) : "", key })));
  const [nextKey, setNextKey] = useState(rows.length);
  const total = rows.reduce((n, r) => n + (parseEuros(r.amount) ?? 0), 0);

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <Card className="flex min-w-0 flex-col gap-4">
        <Field label="Goal name" error={err.title} limit={limits.goal.title}>
          <Input name="title" defaultValue={goal?.title} limit={limits.goal.title} placeholder="e.g. New Kits" />
        </Field>
        <Field label="What it's for (optional)" error={err.purpose} hint="One sentence, shown on the ballot." limit={limits.goal.purpose}>
          <Input name="purpose" defaultValue={goal?.purpose ?? ""} limit={limits.goal.purpose} />
        </Field>
        <Field label="Headline (optional)" error={err.headline} limit={limits.goal.headline}>
          <Input
            name="headline"
            defaultValue={goal?.headline ?? ""}
            limit={limits.goal.headline}
            placeholder="e.g. A place for every player"
          />
        </Field>
        <Field label="Why it matters (optional)" error={err.description} hint="Who benefits across the four codes?">
          <Textarea name="description" defaultValue={goal?.description ?? ""} limit={limits.goal.description} />
        </Field>
      </Card>

      <Card className="flex min-w-0 flex-col gap-4 self-start">
        <Field label="Target (€)" error={err.targetCents}>
          <Input name="targetCents" inputMode="decimal" defaultValue={goal ? euro(goal.targetCents) : ""} required />
        </Field>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Where the money goes</p>
          {rows.map((r) => (
            <div key={r.key} className="flex gap-2">
              <Input
                name="breakdownLabel"
                value={r.label}
                onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, label: e.target.value } : x)))}
                placeholder="e.g. Delivery"
                maxLength={limits.goal.breakdownLabel[1]}
                aria-label="Cost description"
              />
              <Input
                name="breakdownAmount"
                value={r.amount}
                inputMode="decimal"
                onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, amount: e.target.value } : x)))}
                placeholder="€"
                aria-label="Amount in euro"
                className="w-24 shrink-0 sm:w-28"
              />
              <button
                type="button"
                aria-label="Remove this line"
                onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                className="grid size-12 shrink-0 place-items-center rounded-xl text-muted hover:bg-paper"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setRows([...rows, { label: "", amount: "", key: nextKey }]);
                setNextKey(nextKey + 1);
              }}
            >
              <PlusIcon className="size-4" /> Add a cost
            </Button>
            <span className="text-sm text-muted">Total {formatMoney(total)}</span>
          </div>
          {err.breakdown && <p className="text-xs font-medium text-red-700 dark:text-red-300">{err.breakdown}</p>}
        </div>
        {state?.message && <Notice tone="error">{state.message}</Notice>}
        {state && !state.ok && !state.message && <Notice tone="error">Please check the highlighted fields.</Notice>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : goal ? "Save changes" : "Propose goal"}
        </Button>
      </Card>
    </form>
  );
}

export function OfflineFundsForm({ goalId }: { goalId: string }) {
  const [state, onSubmit, pending] = useFormAction(recordOfflineFundsAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="goalId" value={goalId} />
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Field label="Amount (€)" error={state?.errors?.amount}>
          <Input name="amount" inputMode="decimal" required />
        </Field>
        <Field label="Note" error={state?.errors?.note}>
          <Input name="note" placeholder="e.g. Church gate collection" limit={limits.goal.offlineNote} />
        </Field>
      </div>
      {state?.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Recording…" : "Record offline funds"}
      </Button>
    </form>
  );
}
