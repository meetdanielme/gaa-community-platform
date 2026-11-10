import Link from "next/link";
import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, LinkButton } from "@/components/ui";
import { formatLongDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getMyDonations } from "@/server/profile";

export const metadata: Metadata = { title: "Your donations" };

const statusLabel: Record<string, string> = {
  succeeded: "Confirmed",
  declined: "Declined",
  pending: "Awaiting confirmation",
};

export default async function DonationsPage() {
  const user = await requireUser();
  const donations = await getMyDonations(user.id);
  const total = donations.filter((d) => d.status === "succeeded").reduce((n, d) => n + d.amountCents, 0);

  return (
    <>
      <PageHeader title="Your donations" backHref="/profile" />
      <PageBody className="flex max-w-3xl flex-col gap-6">
        <Card>
          <p className="text-sm text-muted">Total given</p>
          <p className="text-4xl font-bold text-navy">{formatMoney(total, { cents: total % 100 !== 0 })}</p>
        </Card>

        {donations.length === 0 ? (
          <Card className="flex flex-col gap-3">
            <p>You haven&apos;t made a donation yet.</p>
            <LinkButton href="/donate" variant="primary">
              See the current goal
            </LinkButton>
          </Card>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-paper">
              {donations.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <Link href={`/donate/${d.goal.slug}`} className="font-semibold hover:underline">
                      {d.goal.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatLongDate(d.createdAt)} · {statusLabel[d.status] ?? d.status}
                      {d.receiptNumber && ` · Receipt ${d.receiptNumber}`}
                    </p>
                  </div>
                  <p className={`text-lg font-bold ${d.status === "succeeded" ? "text-navy" : "text-muted line-through"}`}>
                    {formatMoney(d.amountCents, { cents: d.amountCents % 100 !== 0 })}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </PageBody>
    </>
  );
}
