"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type FormState } from "@/lib/form-state";
import { ROLES } from "@/lib/rules/roles";
import { requireAdmin } from "@/lib/session";
import { parseMemberForm } from "@/lib/validation";
import { audit } from "@/server/audit";
import { db } from "@/db";
import { createFeeIfMissing, setFeeStatus, updateAccountAccess } from "@/server/admin/members";
import { removeMember, saveMember } from "@/server/profile";

export async function updateAccessAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ userId: z.string().min(1), roles: z.array(z.enum(ROLES)), isAdmin: z.boolean() })
    .safeParse({
      userId: formData.get("userId"),
      roles: formData.getAll("roles"),
      isAdmin: formData.get("isAdmin") === "on",
    });
  if (!parsed.success) return fieldErrors(parsed.error);
  const result = await updateAccountAccess(admin, parsed.data.userId, parsed.data);
  if (!result.ok) return { ok: false, message: result.error };
  refresh();
  return { ok: true, message: "Access updated." };
}

export async function setFeeStatusAction(feeId: string, status: "paid" | "sponsored" | "unpaid") {
  const admin = await requireAdmin();
  await setFeeStatus(admin, z.string().uuid().parse(feeId), z.enum(["paid", "sponsored", "unpaid"]).parse(status));
  refresh();
}

export async function createFeeAction(memberId: string, code: string) {
  const admin = await requireAdmin();
  await createFeeIfMissing(admin, z.string().uuid().parse(memberId), z.string().max(40).parse(code));
  refresh();
}

/** Club records: an admin adds or corrects a family member on someone's account. */
export async function saveMemberForAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = z.string().min(1).parse(formData.get("userId"));
  const parsed = parseMemberForm(formData);
  if (!parsed.success) return fieldErrors(parsed.error);
  const saved = await saveMember(userId, parsed.data);
  if (!saved) return { ok: false, message: "That member isn't on this account." };
  await audit(db, admin, parsed.data.id ? "member.update" : "member.add", `${parsed.data.id ? "Updated" : "Added"} family member ${saved.fullName}`);
  refresh();
  return { ok: true, message: saved.team ? `Saved. ${saved.fullName} is in the ${saved.team} team.` : "Saved." };
}

export async function removeMemberForAccountAction(userId: string, memberId: string) {
  const admin = await requireAdmin();
  const removed = await removeMember(z.string().min(1).parse(userId), z.string().uuid().parse(memberId));
  if (removed) await audit(db, admin, "member.remove", `Removed family member ${removed.fullName}`);
  refresh();
}
