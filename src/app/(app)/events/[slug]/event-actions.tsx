"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Button, Notice } from "@/components/ui";
import type { EventResponseChoice } from "@/lib/rules/events";
import { respondAction, setReminderAction } from "../actions";

type Attendee = {
  memberId: string;
  name: string;
  relationship: string;
  response: EventResponseChoice | null;
};

const responseLabel = { going: "Going", not_going: "Not going" } as const;

/* UC3 — Respond to event invitations (Figma "Sheet / rsvp" and "rsvped"). */
export function RespondButton({
  eventId,
  eventTitle,
  attendees,
}: {
  eventId: string;
  eventTitle: string;
  attendees: Attendee[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const responded = attendees.filter((a) => a.response === "going");
  const label =
    attendees.length === 1
      ? "Respond"
      : responded.length > 0
        ? `Update responses (${responded.length} going)`
        : "Respond for your family";

  function respond(a: Attendee, choice: EventResponseChoice) {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await respondAction({ eventId, memberId: a.memberId, choice });
      if (result.ok) setSaved(`${a.name}: ${responseLabel[choice]}`);
      else setError(result.error);
    });
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Your event response">
        <p className="text-lg font-bold text-navy">{eventTitle}</p>
        <ul className="flex flex-col gap-3">
          {attendees.map((a) => (
            <li key={a.memberId} className="flex flex-col gap-2 rounded-2xl bg-paper p-4">
              <p className="font-semibold">
                {a.name}
                {a.relationship === "self" && <span className="font-normal text-muted"> (you)</span>}
              </p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Response for ${a.name}`}>
                {(["going", "not_going"] as const).map((choice) => (
                  <Button
                    key={choice}
                    variant={a.response === choice ? "primary" : "secondary"}
                    aria-pressed={a.response === choice}
                    disabled={pending}
                    onClick={() => respond(a, choice)}
                    size="sm"
                  >
                    {a.response === choice && <CheckIcon className="size-4" />}
                    {responseLabel[choice]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {saved && <Notice tone="success">Saved — {saved}.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </Sheet>
    </>
  );
}

/* Figma "Sheet / reminder" and "reminderOff". */
export function ReminderToggle({ eventId, eventTitle, on }: { eventId: string; eventTitle: string; on: boolean }) {
  const [sheet, setSheet] = useState<"on" | "off" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setReminderAction(eventId, !on);
            setSheet(on ? "off" : "on");
          })
        }
      >
        {on ? "Reminder on — turn off" : "Remind me"}
      </Button>
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "on" ? "Reminder set" : "Reminder off"}>
        <p className="text-muted">
          {sheet === "on"
            ? `We'll remind you the day before ${eventTitle}.`
            : `You won't get a reminder for ${eventTitle}.`}
        </p>
        <Button variant="primary" onClick={() => setSheet(null)}>
          Done
        </Button>
      </Sheet>
    </>
  );
}
