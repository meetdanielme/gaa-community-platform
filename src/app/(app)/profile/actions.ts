"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type FormState } from "@/lib/form-state";
import { requireUser } from "@/lib/session";
import { contactSchema, parseMemberForm } from "@/lib/validation";
import {
  cancelMembership,
  payMembershipFee,
  removeMember,
  saveMember,
  updateContactDetails,
} from "@/server/profile";
import { savedMessage } from "@/lib/members";
import { cancelHandover, inviteToOwnAccount } from "@/server/handover";

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
  // The member page announces the team they were placed in.
  if (!parsed.data.id) redirect(`/profile/members/${saved.id}?added=1`);
  refresh();
  return { ok: true, message: savedMessage(saved) };
}

export async function removeMemberAction(memberId: string) {
  const user = await requireUser();
  await removeMember(user.id, z.string().uuid().parse(memberId));
  redirect("/profile");
}

export type CancelResult = { ok: true; alerted: boolean } | { ok: false; error: string };

/* Cancel one membership (code). Paid memberships alert the club (see rules/membership). */
export async function cancelMembershipAction(memberId: string, code: string): Promise<CancelResult> {
  const user = await requireUser();
  const saved = await cancelMembership(user.id, z.string().uuid().parse(memberId), z.string().max(40).parse(code));
  if (!saved) return { ok: false, error: "That membership couldn't be found. It may already be cancelled." };
  refresh();
  return { ok: true, alerted: saved.cancelledPaid.length > 0 };
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

export type HandoverResult = { ok: true; email: string; link: string } | { ok: false; error: string };

/* Invite an adult family member to manage their own profile (parent or club admin). */
export async function inviteHandoverAction(memberId: string, email: string): Promise<HandoverResult> {
  const user = await requireUser();
  const parsed = z.string().trim().email().max(254).safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const result = await inviteToOwnAccount(user, z.string().uuid().parse(memberId), parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  refresh();
  return { ok: true, email: result.email, link: result.link };
}

export async function cancelHandoverAction(memberId: string) {
  const user = await requireUser();
  await cancelHandover(user, z.string().uuid().parse(memberId));
  refresh();
}
