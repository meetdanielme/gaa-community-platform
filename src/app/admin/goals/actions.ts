"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, formFields, type FormState } from "@/lib/form-state";
import { requireAdmin } from "@/lib/session";
import { optional, text } from "@/lib/validation";
import { limits } from "@/lib/limits";
import { parseEuros } from "@/lib/format";
import { activateGoal, recordOfflineFunds, saveGoal, setGoalWithdrawn } from "@/server/admin/fundraising";

/** "1,250.50" or "12,50" → cents */
const euros = (message: string) =>
  z.string().transform((v, ctx) => {
    const cents = parseEuros(v);
    if (cents === null || cents <= 0 || cents > 1_000_000_000) {
      ctx.addIssue({ code: "custom", message });
      return 0;
    }
    return cents;
  });

const goalSchema = z.object({
  id: z.string().uuid().optional(),
  title: text(limits.goal.title, "Name the goal"),
  purpose: optional(limits.goal.purpose[1]),
  headline: optional(limits.goal.headline[1]),
  description: optional(limits.goal.description[1]),
  targetCents: euros("Enter the amount to raise, e.g. 4000"),
});

export async function saveGoalAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = goalSchema.safeParse(formFields(formData, ["id", "title", "purpose", "headline", "description", "targetCents"]));
  if (!parsed.success) return fieldErrors(parsed.error);

  const labels = formData.getAll("breakdownLabel").map(String);
  const amounts = formData.getAll("breakdownAmount").map(String);
  const breakdown = [];
  for (const [i, label] of labels.entries()) {
    if (!label.trim() && !amounts[i]?.trim()) continue;
    const cents = parseEuros(amounts[i] ?? "");
    if (!label.trim() || cents === null || cents <= 0) {
      return { ok: false, errors: { breakdown: "Each cost line needs a description and an amount." } };
    }
    breakdown.push({ label: label.trim(), amountCents: cents });
  }
  const total = breakdown.reduce((n, b) => n + b.amountCents, 0);
  if (breakdown.length && total !== parsed.data.targetCents) {
    return { ok: false, errors: { breakdown: "The cost lines should add up to the target, so members see where every euro goes." } };
  }

  const result = await saveGoal(admin, { ...parsed.data, breakdown });
  if (!result.ok) return { ok: false, message: result.error };
  redirect("/admin/goals");
}

export async function setGoalWithdrawnAction(goalId: string, withdrawn: boolean) {
  const admin = await requireAdmin();
  await setGoalWithdrawn(admin, z.string().uuid().parse(goalId), withdrawn);
  refresh();
}

export async function activateGoalAction(goalId: string) {
  const admin = await requireAdmin();
  const result = await activateGoal(admin, z.string().uuid().parse(goalId));
  refresh();
  return result;
}

const offlineSchema = z.object({
  goalId: z.string().uuid(),
  amount: euros("Enter an amount, e.g. 250"),
  note: z.string().trim().max(120),
});

export async function recordOfflineFundsAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = offlineSchema.safeParse(formFields(formData, ["goalId", "amount", "note"]));
  if (!parsed.success) return fieldErrors(parsed.error);
  const result = await recordOfflineFunds(admin, parsed.data.goalId, parsed.data.amount, parsed.data.note);
  if (!result.ok) return { ok: false, message: result.error };
  refresh();
  const done = result.progression.outcome !== "retain";
  return {
    ok: true,
    message: done
      ? result.progression.outcome === "advance"
        ? "Recorded — the goal is fully funded and the next goal is now active!"
        : "Recorded — the goal is fully funded. The vote was tied, so choose the next goal below."
      : "Recorded and added to the total.",
  };
}
