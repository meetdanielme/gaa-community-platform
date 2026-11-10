import { codeLabel } from "@/club.config";
import { Notice } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { cancellationNeedsAlert } from "@/lib/rules/membership";
import type { MemberWithSeason } from "@/server/profile";

/**
 * Shown before removing a family member whose membership is already paid:
 * removing them cancels it, and the club treasurer is alerted about a refund.
 * Renders nothing when nothing is paid.
 */
export function PaidMembershipWarning({ member }: { member: Pick<MemberWithSeason, "fullName" | "fees"> }) {
  const paid = member.fees.flatMap(({ code, fee }) => (fee && cancellationNeedsAlert(fee.status) ? [{ code, fee }] : []));
  if (paid.length === 0) return null;
  const list = paid.map(({ code, fee }) => `${codeLabel(code)} (${formatMoney(fee.amountCents)})`).join(" and ");
  return (
    <Notice tone="error">
      {member.fullName}&apos;s {list} {paid.length === 1 ? "membership is" : "memberships are"} already paid. Removing
      them cancels {paid.length === 1 ? "it" : "them"} and alerts the club treasurer, who&apos;ll be in touch about a
      refund.
    </Notice>
  );
}
