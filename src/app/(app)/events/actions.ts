"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { responseRejectionMessages } from "@/lib/rules/events";
import { respondToEvent, setReminder } from "@/server/events";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
