import { clubConfig } from "@/club.config";

export function formatMoney(cents: number, opts: { cents?: boolean } = {}) {
  return new Intl.NumberFormat(clubConfig.locale, {
    style: "currency",
    currency: clubConfig.currency,
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(cents / 100);
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
