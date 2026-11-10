"use client";

import { useActionState } from "react";
import { codes } from "@/club.config";
import { Field, Input, Select } from "@/components/form";
import { Button, Notice } from "@/components/ui";
import { relationshipLabels } from "@/lib/members";
import { saveMemberAction, type FormState } from "./actions";

type MemberValues = {
  id?: string;
  fullName: string;
  relationship: string;
  code: string | null;
  team: string | null;
};

export function MemberForm({ member }: { member?: MemberValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMemberAction, null);
  const err = state?.errors ?? {};
  const isSelf = member?.relationship === "self";

  return (
    <form action={action} className="flex flex-col gap-4">
      {member?.id && <input type="hidden" name="id" value={member.id} />}
      <Field label="Full name" error={err.fullName}>
        <Input name="fullName" defaultValue={member?.fullName} required maxLength={80} readOnly={isSelf} />
      </Field>
      {isSelf ? (
        <input type="hidden" name="relationship" value="self" />
      ) : (
        <Field label="Relationship to you" error={err.relationship}>
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
      <Field label="Code" error={err.code}>
        <Select name="code" defaultValue={member?.code ?? ""}>
          <option value="">Not playing</option>
          {codes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Team" hint="e.g. U12, U18, Adult" error={err.team}>
        <Input name="team" defaultValue={member?.team ?? ""} maxLength={30} />
      </Field>
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
