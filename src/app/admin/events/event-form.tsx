"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useState } from "react";
import { codes } from "@/club.config";
import { ImageField } from "@/components/admin/image-field";
import { Field, Input, Select, textareaClass } from "@/components/form";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { Button, Card, Notice } from "@/components/ui";
import { saveEventAction } from "./actions";

type EventValues = {
  id: string;
  title: string;
  category: string;
  startsAtLocal: string;
  venue: string;
  imageUrl: string | null;
  headline: string;
  description: string;
  schedule: { time: string; label: string }[];
  goodToKnow: string | null;
  recap: string | null;
  capacity: number | null;
  rsvpDeadlineLocal: string;
};

export function EventForm({ event }: { event?: EventValues }) {
  const [state, onSubmit, pending] = useFormAction(saveEventAction);
  const err = state?.errors ?? {};
  const [rows, setRows] = useState(
    (event?.schedule.length ? event.schedule : [{ time: "", label: "" }]).map((r, i) => ({ ...r, key: i })),
  );
  const [nextKey, setNextKey] = useState(rows.length);

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {event && <input type="hidden" name="id" value={event.id} />}
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <Field label="Event name" error={err.title}>
            <Input name="title" defaultValue={event?.title} required maxLength={100} />
          </Field>
          <Field label="One-line summary" error={err.headline} hint="Shown above the description.">
            <Input name="headline" defaultValue={event?.headline} required maxLength={140} />
          </Field>
          <Field label="Description" error={err.description}>
            <textarea name="description" defaultValue={event?.description} required className={textareaClass} />
          </Field>
          <Field label="Good to know (optional)" error={err.goodToKnow} hint="What to bring, accessibility, transport…">
            <textarea name="goodToKnow" defaultValue={event?.goodToKnow ?? ""} className={textareaClass} />
          </Field>
          <Field label="Recap (optional)" error={err.recap} hint="Shown once the event has taken place.">
            <textarea name="recap" defaultValue={event?.recap ?? ""} className={textareaClass} />
          </Field>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">On the day</h2>
          {rows.map((r) => (
            <div key={r.key} className="flex gap-2">
              <Input name="scheduleTime" type="time" defaultValue={r.time} className="w-32 shrink-0" aria-label="Time" />
              <Input name="scheduleLabel" defaultValue={r.label} placeholder="e.g. Warm-up and briefing" aria-label="What happens" />
              <button
                type="button"
                aria-label="Remove this row"
                onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                className="grid size-12 shrink-0 place-items-center rounded-xl text-muted hover:bg-paper"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setRows([...rows, { time: "", label: "", key: nextKey }]);
              setNextKey(nextKey + 1);
            }}
          >
            <PlusIcon className="size-4" /> Add a time
          </Button>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 self-start">
        <Field label="Code / category" error={err.category}>
          <Select name="category" defaultValue={event?.category ?? "all"}>
            <option value="all">All codes</option>
            {codes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            <option value="social">Social</option>
          </Select>
        </Field>
        <Field label="Starts" error={err.startsAt} hint="Irish time.">
          <Input name="startsAt" type="datetime-local" defaultValue={event?.startsAtLocal} required />
        </Field>
        <Field label="Venue" error={err.venue}>
          <Input name="venue" defaultValue={event?.venue} required />
        </Field>
        <Field label="Places (optional)" error={err.capacity} hint="Leave empty for no limit.">
          <Input name="capacity" type="number" min={1} defaultValue={event?.capacity ?? ""} />
        </Field>
        <Field label="Respond by (optional)" error={err.rsvpDeadline}>
          <Input name="rsvpDeadline" type="datetime-local" defaultValue={event?.rsvpDeadlineLocal} />
        </Field>
        <ImageField defaultValue={event?.imageUrl} error={err.imageUrl} />
        {state && !state.ok && <Notice tone="error">Please check the highlighted fields.</Notice>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : event ? "Save changes" : "Create event"}
        </Button>
      </Card>
    </form>
  );
}
