import { clubConfig } from "@/club.config";

/** Offset (ms) of the club's time zone from UTC at a given instant. */
function zoneOffset(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: clubConfig.timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - at.getTime();
}

/**
 * Parses a `<input type="datetime-local">` value ("2026-11-18T11:00") as the
 * club's local time (e.g. Irish time), whatever the server's time zone is.
 */
export function parseClubLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes handle daylight-saving transitions.
  let result = guess - zoneOffset(new Date(guess));
  result = guess - zoneOffset(new Date(result));
  return new Date(result);
}

/** Formats a date as a `datetime-local` value in the club's time zone. */
export function toClubLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const local = new Date(d.getTime() + zoneOffset(d));
  return local.toISOString().slice(0, 16);
}
