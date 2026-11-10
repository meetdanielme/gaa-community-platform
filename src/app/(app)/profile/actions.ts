"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { codes } from "@/club.config";
import { ROLES, serializeRoles } from "@/lib/rules/roles";
import { requireUser } from "@/lib/session";
import { payMembershipFee, removeMember, saveMember, updateContactDetails } from "@/server/profile";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  helpsWith: optional(200),
  roles: z.array(z.enum(ROLES)).min(1, "Choose at least one role"),
});

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((i) => [String(i.path[0]), i.message]));
}

/* BR01 — validate before saving; on failure the previous saved state is kept. */
export async function updateContactAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    eircode: formData.get("eircode") ?? "",
    helpsWith: formData.get("helpsWith") ?? "",
    roles: formData.getAll("roles"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { roles, ...contact } = parsed.data;
  await updateContactDetails(user.id, {
    ...contact,
    eircode: contact.eircode?.toUpperCase() ?? null,
  });
  await db.update(userTable).set({ roles: serializeRoles(roles) }).where(eq(userTable.id, user.id));
  refresh();
  return { ok: true, message: "Your details have been saved." };
}

const codeIds = codes.map((c) => c.id) as [string, ...string[]];

const memberSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2, "Enter the member's full name").max(80),
  relationship: z.enum(["self", "child", "partner", "sibling", "parent", "other"]),
  code: z.union([z.enum(codeIds), z.literal("")]).transform((v) => (v === "" ? null : v)),
  team: optional(30),
});

export async function saveMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = memberSchema.safeParse({
    id: formData.get("id") || undefined,
    fullName: formData.get("fullName") ?? "",
    relationship: formData.get("relationship") ?? "child",
    code: formData.get("code") ?? "",
    team: formData.get("team") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

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
