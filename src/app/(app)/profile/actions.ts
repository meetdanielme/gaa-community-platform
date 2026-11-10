"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { payMembershipFee, updateContactDetails } from "@/server/profile";

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string> } | null;

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: optional(30).refine((v) => v === null || /^[+\d][\d\s()-]{6,}$/.test(v), "Enter a valid phone number"),
  eircode: optional(10).refine(
    (v) => v === null || /^[A-Za-z]\d[\dWw]\s?[A-Za-z\d]{4}$/.test(v),
    "Enter a valid Eircode, e.g. T12 KV06",
  ),
});

/* BR01 — validate before saving; on failure the previous saved state is kept. */
export async function updateContactAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    eircode: formData.get("eircode") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
    };
  }
  await updateContactDetails(user.id, {
    ...parsed.data,
    eircode: parsed.data.eircode?.toUpperCase() ?? null,
  });
  refresh();
  return { ok: true, message: "Your details have been saved." };
}

export type FeeResult =
  | { ok: true; status: "succeeded"; receipt: string | null }
  | { ok: true; status: "declined" | "pending" }
  | { ok: false; error: string };

const feeMessages = {
  not_authorised: "Only the family supporter who manages this profile can pay its fee.",
  already_paid: "This membership is already paid.",
  pending: "A payment for this fee is still being confirmed. We won't charge you twice.",
} as const;

/* BR05 — pay a membership fee. */
export async function payFeeAction(feeId: string, methodId: string): Promise<FeeResult> {
  const user = await requireUser();
  const result = await payMembershipFee(user, z.string().uuid().parse(feeId), z.string().max(40).parse(methodId));
  refresh();
  if (!result.ok) return { ok: false, error: feeMessages[result.reason] };
  if (result.status === "succeeded") return { ok: true, status: "succeeded", receipt: result.receipt };
  return { ok: true, status: result.status };
}
