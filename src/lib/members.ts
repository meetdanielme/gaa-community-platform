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

/** e.g. "Football · U18 · Membership due" */
export function memberSummary(m: { code: string | null; team: string | null; fee: { status: string } | null }) {
  return [
    m.code ? codeLabel(m.code).replace("Gaelic ", "") : null,
    m.team,
    m.fee ? feeStatusLabels[m.fee.status] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
