"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useState } from "react";
import { codes } from "@/club.config";
import { ImageField } from "@/components/admin/image-field";
import { Field, Input, Select } from "@/components/form";
import { Textarea } from "@/components/textarea";
import { limits } from "@/lib/limits";
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
  description: string | null;
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
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {event && <input type="hidden" name="id" value={event.id} />}
      <div className="flex min-w-0 flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <Field label="Event name" error={err.title} limit={limits.event.title}>
            <Input name="title" defaultValue={event?.title} limit={limits.event.title} />
          </Field>
          <Field label="One-line summary" error={err.headline} limit={limits.event.headline}>
            <Input name="headline" defaultValue={event?.headline} limit={limits.event.headline} />
          </Field>
          <Field label="Description (optional)" error={err.description}>
            <Textarea name="description" defaultValue={event?.description ?? ""} limit={limits.event.description} />
          </Field>
          <Field label="Good to know (optional)" error={err.goodToKnow} hint="What to bring, accessibility, transport…">
            <Textarea name="goodToKnow" defaultValue={event?.goodToKnow ?? ""} limit={limits.event.goodToKnow} />
          </Field>
          <Field label="Recap (optional)" error={err.recap} hint="Shown once the event has taken place.">
            <Textarea name="recap" defaultValue={event?.recap ?? ""} limit={limits.event.recap} />
          </Field>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">On the day</h2>
          {rows.map((r) => (
            <div key={r.key} className="flex gap-2">
              <Input name="scheduleTime" type="time" defaultValue={r.time} className="w-28 shrink-0 px-2 sm:w-32 sm:px-4" aria-label="Time" />
              <Input
                name="scheduleLabel"
                defaultValue={r.label}
                limit={limits.event.scheduleLabel}
                placeholder="e.g. Warm-up and briefing"
                aria-label="What happens"
              />
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

      <Card className="flex min-w-0 flex-col gap-4 self-start">
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
        <Field label="Venue" error={err.venue} limit={limits.event.venue}>
          <Input name="venue" defaultValue={event?.venue} limit={limits.event.venue} />
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
