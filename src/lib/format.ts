import { clubConfig } from "@/club.config";

/** "€25", or "€12.50" when there are cents (pass cents: true to always show them). */
export function formatMoney(cents: number, opts: { cents?: boolean } = {}) {
  const showCents = opts.cents ?? cents % 100 !== 0;
  return new Intl.NumberFormat(clubConfig.locale, {
    style: "currency",
    currency: clubConfig.currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(cents / 100);
}

/**
 * Parses a euro amount typed by a person: "15", "12.5", "12,50" or "1,250.75".
 * Returns cents, or null if it isn't a valid amount with at most 2 decimals.
 */
export function parseEuros(input: string): number | null {
  let v = input.trim().replace(/^€/, "").replace(/\s/g, "");
  // A comma followed by 1–2 digits at the end is a decimal comma ("12,50").
  if (/^\d+,\d{1,2}$/.test(v)) v = v.replace(",", ".");
  else v = v.replace(/,(?=\d{3}(\D|$))/g, ""); // thousands separators
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(clubConfig.locale, {
    timeZone: clubConfig.timeZone,
    ...options,
  });

export const formatDayMonth = (d: Date) =>
  fmt({ day: "2-digit", month: "short" }).format(d).toUpperCase();
export const formatWeekday = (d: Date) => fmt({ weekday: "long" }).format(d);
export const formatTime = (d: Date) =>
  fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
export const formatLongDate = (d: Date) =>
  fmt({ day: "numeric", month: "short", year: "numeric" }).format(d);
export const formatToday = (d: Date) =>
  fmt({ weekday: "long", day: "numeric", month: "long" }).format(d);

export function formatRelative(d: Date, now = new Date()) {
  const diffMs = now.getTime() - d.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatLongDate(d);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** A same-site path to return to after signing in, e.g. "/claim/abc"; anything else falls back. */
export function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
