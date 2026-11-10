"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eventCategories } from "@/club.config";
import { parseClubLocal } from "@/lib/datetime";
import { fieldErrors, formFields, type FormState } from "@/lib/form-state";
import { requireAdmin } from "@/lib/session";
import { optional } from "@/lib/validation";
import { deleteEvent, saveEvent, setEventCancelled } from "@/server/admin/content";

const clubLocal = (message: string) =>
  z.string().transform((v, ctx) => {
    const d = parseClubLocal(v);
    if (!d) ctx.addIssue({ code: "custom", message });
    return d as Date;
  });

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Give the event a name").max(100),
  category: z.string().refine((v) => v in eventCategories, "Choose a code or category"),
  startsAt: clubLocal("Choose a date and start time"),
  venue: z.string().trim().min(2, "Where is it?").max(100),
  imageUrl: optional(500).refine((v) => v === null || v.startsWith("/images/") || /^https:\/\/\S+$/.test(v), "Use a club photo or an https:// link"),
  headline: z.string().trim().min(3, "Add a one-line summary").max(140),
  description: z.string().trim().min(10, "Describe the event").max(3000),
  goodToKnow: optional(1000),
  recap: optional(2000),
  capacity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 100000), "Enter a whole number, or leave empty for no limit"),
  rsvpDeadline: z
    .string()
    .transform((v, ctx) => {
      if (v === "") return null;
      const d = parseClubLocal(v);
      if (!d) ctx.addIssue({ code: "custom", message: "Choose a valid date and time" });
      return d;
    }),
});

export async function saveEventAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = eventSchema.safeParse(
    formFields(formData, [
      "id", "title", "category", "startsAt", "venue", "imageUrl", "headline",
      "description", "goodToKnow", "recap", "capacity", "rsvpDeadline",
    ]),
  );
  if (!parsed.success) return fieldErrors(parsed.error);
  if (parsed.data.rsvpDeadline && parsed.data.rsvpDeadline > parsed.data.startsAt) {
    return { ok: false, errors: { rsvpDeadline: "The deadline must be before the event starts." } };
  }

  // Schedule rows arrive as parallel time/label lists.
  const times = formData.getAll("scheduleTime").map(String);
  const labels = formData.getAll("scheduleLabel").map(String);
  const schedule = times
    .map((time, i) => ({ time: time.trim(), label: (labels[i] ?? "").trim() }))
    .filter((r) => r.time && r.label)
    .slice(0, 20);

  const id = await saveEvent(admin, { ...parsed.data, schedule });
  redirect(`/admin/events/${id}`);
}

export async function setEventCancelledAction(id: string, cancelled: boolean) {
  const admin = await requireAdmin();
  await setEventCancelled(admin, z.string().uuid().parse(id), cancelled);
  refresh();
}

export async function deleteEventAction(id: string) {
  const admin = await requireAdmin();
  await deleteEvent(admin, z.string().uuid().parse(id));
  redirect("/admin/events");
}
