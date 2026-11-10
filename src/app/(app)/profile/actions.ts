"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type FormState } from "@/lib/form-state";
import { requireUser } from "@/lib/session";
import { contactSchema, parseMemberForm } from "@/lib/validation";
import { payMembershipFee, removeMember, saveMember, updateContactDetails } from "@/server/profile";

/* BR01 — validate before saving; on failure the previous saved state is kept. */
export async function updateContactAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    eircode: formData.get("eircode") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  await updateContactDetails(user.id, {
    ...parsed.data,
    eircode: parsed.data.eircode?.toUpperCase() ?? null,
  });
  refresh();
  return { ok: true, message: "Your details have been saved." };
}

/* UC1 — add or edit a family member you manage. */
export async function saveMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseMemberForm(formData);
  if (!parsed.success) return fieldErrors(parsed.error);
  const saved = await saveMember(user.id, parsed.data);
  if (!saved) return { ok: false, message: "You can only edit family members you manage." };
  if (!parsed.data.id) redirect(`/profile/members/${saved.id}`);
  refresh();
  return { ok: true, message: "Member details saved." };
}

export async function removeMemberAction(memberId: string) {
  const user = await requireUser();
  await removeMember(user.id, z.string().uuid().parse(memberId));
  redirect("/profile");
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
