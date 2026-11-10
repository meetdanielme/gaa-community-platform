"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { responseRejectionMessages } from "@/lib/rules/events";
import { respondToEvent, setReminder, volunteerForRole, withdrawFromRole } from "@/server/events";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string; needsAcknowledgement?: boolean };

const respondSchema = z.object({
  eventId: z.string().uuid(),
  memberId: z.string().uuid(),
  choice: z.enum(["going", "not_going"]),
});

export async function respondAction(input: z.infer<typeof respondSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something about that response wasn't valid." };
  const decision = await respondToEvent(user, parsed.data);
  if (!decision.ok) return { ok: false, error: responseRejectionMessages[decision.reason] };
  refresh();
  return { ok: true };
}

export async function setReminderAction(eventId: string, on: boolean): Promise<ActionResult> {
  const user = await requireUser();
  await setReminder(user.id, z.string().uuid().parse(eventId), on);
  refresh();
  return { ok: true };
}

const volunteerMessages = {
  not_eligible: "Volunteering is open to volunteers and family supporters. You can add the volunteer role in your profile.",
  closed: "This event is no longer taking volunteers.",
  full: "This role is already full. Thank you for offering!",
  already_assigned: "You're already signed up for this role.",
  conflict: "You're already volunteering at another event that day.",
} as const;

export async function volunteerAction(roleId: string, acknowledgeConflict: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const decision = await volunteerForRole(user, {
    roleId: z.string().uuid().parse(roleId),
    acknowledgeConflict,
  });
  if (!decision.ok) {
    return {
      ok: false,
      error: volunteerMessages[decision.reason],
      needsAcknowledgement: decision.reason === "conflict",
    };
  }
  refresh();
  return { ok: true };
}

export async function withdrawAction(roleId: string): Promise<ActionResult> {
  const user = await requireUser();
  await withdrawFromRole(user.id, z.string().uuid().parse(roleId));
  refresh();
  return { ok: true };
}
