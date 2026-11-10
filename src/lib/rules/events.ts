/**
 * BR03 Event response (activity diagram D03).
 */

export type EventResponseChoice = "going" | "not_going";

export type ResponseDecision =
  | { ok: true; goingDelta: -1 | 0 | 1 }
  | {
      ok: false;
      reason: "not_authorised" | "cancelled" | "past" | "deadline_passed" | "full";
    };

/**
 * Capacity allows an existing Going response to remain Going without
 * reserving a second place; changing from Going releases the place.
 */
export function decideEventResponse(input: {
  authorised: boolean;
  cancelled: boolean;
  startsAt: Date;
  rsvpDeadline: Date | null;
  now: Date;
  previous: EventResponseChoice | null;
  choice: EventResponseChoice;
  goingCount: number;
  capacity: number | null;
}): ResponseDecision {
  if (!input.authorised) return { ok: false, reason: "not_authorised" };
  if (input.cancelled) return { ok: false, reason: "cancelled" };
  if (input.startsAt <= input.now) return { ok: false, reason: "past" };
  if (input.rsvpDeadline && input.rsvpDeadline <= input.now)
    return { ok: false, reason: "deadline_passed" };

  const wasGoing = input.previous === "going";
  const willGo = input.choice === "going";

  if (willGo && !wasGoing && input.capacity !== null && input.goingCount >= input.capacity)
    return { ok: false, reason: "full" };

  const goingDelta = wasGoing === willGo ? 0 : willGo ? 1 : -1;
  return { ok: true, goingDelta };
}

export const responseRejectionMessages: Record<
  Extract<ResponseDecision, { ok: false }>["reason"],
  string
> = {
  not_authorised: "You can only respond for yourself or family members you manage.",
  cancelled: "This event has been cancelled.",
  past: "This event has already taken place.",
  deadline_passed: "The response deadline for this event has passed.",
  full: "This event is full. Your previous response has been kept.",
};
