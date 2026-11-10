import { codeLabel } from "@/club.config";

export const relationshipLabels: Record<string, string> = {
  self: "You",
  child: "Child",
  partner: "Partner",
  sibling: "Sibling",
  parent: "Parent",
  other: "Other",
};

export const feeStatusLabels: Record<string, string> = {
  unpaid: "Membership due",
  pending: "Payment pending",
  paid: "Paid",
  sponsored: "Sponsored",
};

/** Short code names for compact summaries, e.g. "Football" rather than "Gaelic Football". */
export const shortCodeLabel = (code: string) => codeLabel(code).replace("Gaelic ", "");

/** One status for all of a member's fees: anything owed shows as due. */
export function overallFeeStatus(fees: { fee: { status: string } | null }[]) {
  const statuses = fees.map((f) => f.fee?.status).filter((s): s is string => Boolean(s));
  if (statuses.length === 0) return null;
  if (statuses.includes("unpaid")) return "unpaid";
  if (statuses.includes("pending")) return "pending";
  return statuses.every((s) => s === "sponsored") ? "sponsored" : "paid";
}

/** e.g. "Hurling & Football · U18 · Membership due" */
export function memberSummary(m: { codes: string[]; team: string | null; fees: { fee: { status: string } | null }[] }) {
  const status = overallFeeStatus(m.fees);
  return [
    m.codes.map(shortCodeLabel).join(" & ") || null,
    m.team,
    status ? feeStatusLabels[status] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Tells the family which team the member was placed in, and about any paid cancellation. */
export function savedMessage(saved: { fullName: string; team: string | null; cancelledPaid: unknown[] }) {
  const parts = ["Member details saved."];
  if (saved.team) parts.push(`${saved.fullName} is in the ${saved.team} team this season.`);
  if (saved.cancelledPaid.length)
    parts.push("That membership was already paid, so we've alerted the club treasurer about a refund.");
  return parts.join(" ");
}
