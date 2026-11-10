"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useState } from "react";
import { Field, Input } from "@/components/form";
import { Sheet } from "@/components/sheet";
import { Button, Notice } from "@/components/ui";
import { updateContactAction } from "./actions";

/* Figma "Sheet / edit" (Contact details) and "editSaved". */
export function EditContactButton({
  user,
}: {
  user: { name: string; email: string; phone: string | null; eircode: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction(updateContactAction);
  const err = state?.errors ?? {};

  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit contact details</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Contact details">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Name" error={err.name}>
            <Input name="name" defaultValue={user.name} required autoComplete="name" />
          </Field>
          <Field label="Phone" error={err.phone}>
            <Input name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />
          </Field>
          <Field label="Email" hint="This is your sign-in email. Contact the club to change it.">
            <Input type="email" value={user.email} readOnly />
          </Field>
          <Field label="Eircode" error={err.eircode}>
            <Input name="eircode" defaultValue={user.eircode ?? ""} autoComplete="postal-code" />
          </Field>
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
