"use client";

import { useActionState, useState } from "react";
import { Field, Input } from "@/components/form";
import { Sheet } from "@/components/sheet";
import { Button, Notice } from "@/components/ui";
import { ROLES, roleLabels, type Role } from "@/lib/rules/roles";
import { updateContactAction, type FormState } from "./actions";

/* Figma "Sheet / editContact" and "editSaved". */
export function EditContactButton({
  user,
}: {
  user: { name: string; phone: string | null; eircode: string | null; helpsWith: string | null; roles: Role[] };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(updateContactAction, null);
  const err = state?.errors ?? {};

  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit contact details</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit your details">
        <form action={action} className="flex flex-col gap-4">
          <Field label="Full name" error={err.name}>
            <Input name="name" defaultValue={user.name} required autoComplete="name" />
          </Field>
          <Field label="Phone" error={err.phone}>
            <Input name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />
          </Field>
          <Field label="Eircode" error={err.eircode}>
            <Input name="eircode" defaultValue={user.eircode ?? ""} autoComplete="postal-code" />
          </Field>
          <Field label="How you help" hint="e.g. Carpooling · First aid" error={err.helpsWith}>
            <Input name="helpsWith" defaultValue={user.helpsWith ?? ""} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold">Your roles</legend>
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="roles"
                  value={r}
                  defaultChecked={user.roles.includes(r)}
                  className="size-4 accent-navy"
                />
                {roleLabels[r]}
              </label>
            ))}
            {err.roles && <span className="text-xs text-red-700">{err.roles}</span>}
          </fieldset>
          {state?.ok && <Notice tone="success">{state.message}</Notice>}
          {state && !state.ok && <Notice tone="error">Please check the highlighted fields. Nothing was changed.</Notice>}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
