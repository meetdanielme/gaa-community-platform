"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { claimMessages } from "@/lib/rules/handover";
import { requireUser } from "@/lib/session";
import { claimProfile } from "@/server/handover";

export type ClaimResult = { ok: false; error: string } | null;

/* Accept an invitation to manage your own member profile. */
export async function claimAction(token: string): Promise<ClaimResult> {
  const user = await requireUser();
  const result = await claimProfile(user, z.string().min(20).max(100).parse(token));
  if (!result.ok) return { ok: false, error: claimMessages[result.reason] };
  redirect("/profile?claimed=1");
}
