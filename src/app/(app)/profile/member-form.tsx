"use client";

import { use, useState } from "react";
import { SheetContext } from "@/components/sheet";
import type { FormState } from "@/lib/form-state";
import { useFormAction } from "@/lib/use-form-action";
import { clubConfig, codeLabel, codes } from "@/club.config";
import { Field, Input, Select } from "@/components/form";
import { Button, Notice } from "@/components/ui";
import { relationshipLabels } from "@/lib/members";
import { assignTeam } from "@/lib/rules/membership";
import { limits } from "@/lib/limits";

type MemberValues = {
  id?: string;
  fullName: string;
  relationship: string;
  codes: string[];
  dateOfBirth: string | null;
};

/** Add/edit a family member. Used by families (Profile) and club admins. */
export function MemberForm({
  member,
  paidCodes = [],
  action: serverAction,
  hidden,
}: {
  member?: MemberValues;
  /** Codes whose membership is already paid: unticking one warns first. */
  paidCodes?: string[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Extra hidden fields, e.g. the account an admin is editing. */
  hidden?: Record<string, string>;
}) {
  const sheet = use(SheetContext);
  const [state, onSubmit, pending] = useFormAction(async (prev, formData) => {
    const result = await serverAction(prev, formData);
    // Adding someone in a sheet (club admin) closes it, so the same person
    // can't be added twice by pressing again. Edits stay open to show the team.
    if (result?.ok && !member?.id) sheet?.close();
    return result;
  });
  const [playing, setPlaying] = useState<string[]>(member?.codes ?? []);
  const [dateOfBirth, setDateOfBirth] = useState(member?.dateOfBirth ?? "");
  const err = state?.errors ?? {};
  const isSelf = member?.relationship === "self";
  const max = clubConfig.maxCodesPerMember;
  const team =
    playing.length && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? assignTeam(dateOfBirth, clubConfig.season, clubConfig.ageGrades, clubConfig.minPlayingAge)
      : null;
  const cancellingPaid = paidCodes.filter((c) => !playing.includes(c));

  function toggle(code: string, on: boolean) {
    setPlaying((p) => (on ? [...p, code] : p.filter((c) => c !== code)));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {member?.id && <input type="hidden" name="id" value={member.id} />}
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Field
        label="Full name"
        error={err.fullName}
        hint={isSelf ? "Change your own name in Contact details." : undefined}
        limit={isSelf ? undefined : limits.member.fullName}
      >
        <Input name="fullName" defaultValue={member?.fullName} limit={limits.member.fullName} readOnly={isSelf} />
      </Field>
      {isSelf ? (
        <input type="hidden" name="relationship" value="self" />
      ) : (
        <Field label="Relationship" error={err.relationship}>
          <Select name="relationship" defaultValue={member?.relationship ?? "child"}>
            {Object.entries(relationshipLabels)
              .filter(([k]) => k !== "self")
              .map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
          </Select>
        </Field>
      )}
      <Field
        label="Date of birth"
        error={err.dateOfBirth}
        hint={playing.length ? "We use this to place players in the right age-grade team." : "Needed if they play."}
      >
        <Input
          name="dateOfBirth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          required={playing.length > 0}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-ink">Codes they play</legend>
        <p className="-mt-1 mb-1 text-xs text-muted">
          Choose up to {max}, e.g. hurling and football. Each code is a separate membership.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {codes.map((c) => {
            const checked = playing.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl bg-paper p-3 ${
                  !checked && playing.length >= max ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  name="codes"
                  value={c.id}
                  checked={checked}
                  disabled={!checked && playing.length >= max}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                  className="size-4 accent-navy"
                />
                <span className="font-medium">{c.label}</span>
              </label>
            );
          })}
        </div>
        {err.codes && (
          <span role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
            {err.codes}
          </span>
        )}
      </fieldset>
      {team && (
        <Notice>
          Team this season: <strong>{team}</strong>
        </Notice>
      )}
      {cancellingPaid.length > 0 && (
        <Notice tone="error">
          {cancellingPaid.map(codeLabel).join(" and ")} {cancellingPaid.length === 1 ? "is" : "are"} already paid for.
          Saving will cancel {cancellingPaid.length === 1 ? "that membership" : "those memberships"} and alert the club
          treasurer, who&apos;ll be in touch about a refund.
        </Notice>
      )}
      {state?.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      {state && !state.ok && !state.message && (
        <Notice tone="error">Please check the highlighted fields. Nothing was changed.</Notice>
      )}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : member?.id ? "Save changes" : "Add family member"}
      </Button>
    </form>
  );
}
