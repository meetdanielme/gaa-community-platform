import type { z } from "zod";

/** Result of a form Server Action, consumed with useActionState. */
export type FormState = { ok: boolean; message?: string; errors?: Record<string, string> } | null;

export function fieldErrors(error: z.ZodError): FormState {
  return { ok: false, errors: Object.fromEntries(error.issues.map((i) => [String(i.path[0]), i.message])) };
}

/**
 * Reads named fields from a form as strings ("" when missing). An empty `id`
 * is left out, so the same schema handles create and update.
 */
export function formFields(formData: FormData, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = formData.get(k);
    const s = typeof v === "string" ? v : "";
    if (k === "id" && !s) continue;
    out[k] = s;
  }
  return out;
}
