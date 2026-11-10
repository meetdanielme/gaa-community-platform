/**
 * BR03 Event response (D03) and BR04 Volunteer registration (D04).
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

export type VolunteerDecision =
  | { ok: true }
  | { ok: false; reason: "not_eligible" | "closed" | "full" | "already_assigned" }
  | { ok: false; reason: "conflict"; needsAcknowledgement: true };

/**
 * IF role is open AND capacity remains AND requirements are met
 * AND (no commitment conflict OR user acknowledges the warning)
 * THEN assign the volunteer once
 */
export function decideVolunteer(input: {
  eligible: boolean;
  eventOpen: boolean;
  assignedCount: number;
  capacity: number;
  alreadyAssigned: boolean;
  hasConflict: boolean;
  acknowledgedConflict: boolean;
}): VolunteerDecision {
  if (!input.eligible) return { ok: false, reason: "not_eligible" };
  if (!input.eventOpen) return { ok: false, reason: "closed" };
  if (input.alreadyAssigned) return { ok: false, reason: "already_assigned" };
  if (input.assignedCount >= input.capacity) return { ok: false, reason: "full" };
  if (input.hasConflict && !input.acknowledgedConflict)
    return { ok: false, reason: "conflict", needsAcknowledgement: true };
  return { ok: true };
}
