"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "./form-state";

/**
 * Like useActionState, but submits via onSubmit. React resets forms that use
 * the `action` prop after every submission, which would wipe what someone
 * typed whenever validation fails. Use: <form onSubmit={onSubmit}>.
 */
export function useFormAction(serverAction: (state: FormState, formData: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState<FormState, FormData>(serverAction, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return [state, onSubmit, pending] as const;
}
