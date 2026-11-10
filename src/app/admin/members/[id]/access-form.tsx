"use client";

import { useFormAction } from "@/lib/use-form-action";
import { Button, Notice } from "@/components/ui";
import { ROLES, roleLabels, type Role } from "@/lib/rules/roles";
import { updateAccessAction } from "../actions";

export function AccessForm({ userId, roles, isAdmin, isSelf }: { userId: string; roles: Role[]; isAdmin: boolean; isSelf: boolean }) {
  const [state, onSubmit, pending] = useFormAction(updateAccessAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Roles</legend>
        {ROLES.map((r) => (
          <label key={r} className="flex items-center gap-3">
            <input type="checkbox" name="roles" value={r} defaultChecked={roles.includes(r)} className="size-4 accent-navy" />
            {roleLabels[r]}
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-3 rounded-xl bg-paper p-3">
        <input type="checkbox" name="isAdmin" defaultChecked={isAdmin} className="mt-1 size-4 accent-navy" />
        <span>
          <span className="block font-semibold">Club admin</span>
          <span className="text-sm text-muted">
            Can manage posts, events, fundraising, members and see donor details.
            {isSelf && " Removing your own access signs you out of the admin area."}
          </span>
        </span>
      </label>
      {state?.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save access"}
      </Button>
    </form>
  );
}
