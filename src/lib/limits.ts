/**
 * Character limits for text fields, as [min, max]. Shared by the forms (so
 * the browser enforces them and shows them) and the server-side validation.
 * A min of 0 means the field is optional.
 */
export const limits = {
  member: { fullName: [2, 80] },
  contact: { name: [2, 80], phone: [0, 30], eircode: [0, 10] },
  event: {
    title: [3, 100],
    headline: [3, 140],
    description: [0, 3000],
    venue: [2, 100],
    goodToKnow: [0, 1000],
    recap: [0, 2000],
    scheduleLabel: [0, 80],
  },
  goal: {
    title: [3, 80],
    purpose: [0, 160],
    headline: [0, 100],
    description: [0, 3000],
    breakdownLabel: [0, 60],
    offlineNote: [0, 120],
  },
  post: { title: [3, 120], body: [10, 2000], ctaLabel: [0, 40], ctaHref: [0, 200] },
} as const satisfies Record<string, Record<string, readonly [number, number]>>;

export type Limit = readonly [min: number, max: number];

/** "3–100 characters" or "Up to 1,000 characters" */
export function limitHint([min, max]: Limit) {
  const n = (x: number) => x.toLocaleString("en-IE");
  return min > 0 ? `${n(min)}–${n(max)} characters` : `Up to ${n(max)} characters`;
}
