import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/page-header";
import { LinkButton, Tag } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getLatestProgression } from "@/server/fundraising";

export const metadata: Metadata = { title: "Next club goal" };

/* Figma "nextgoal / Next club goal" — shown after BR08 advances the goal. */
export default async function GoalAchievedPage() {
  await requireUser();
  const progression = await getLatestProgression();
  if (!progression) redirect("/donate");
  const { funded, next } = progression;

  return (
    <>
      <PageHeader title="Next club goal" backHref="/donate" />
      <PageBody className="flex max-w-3xl flex-col gap-6">
        <div>
          <Tag>Funded together</Tag>
        </div>
        <h2 className="text-3xl leading-tight font-bold tracking-tight">
          {funded.title}
          <br />A goal, achieved.
        </h2>
        <p className="max-w-md">
          {formatMoney(funded.raisedCents)} of {formatMoney(funded.targetCents)} raised. Thank you for making {funded.title.toLowerCase()} possible across all four codes.
        </p>
        <hr className="border-ink/10" />
        <h3 className="text-xl font-bold">Next, chosen by you</h3>
        {next ? (
          <>
            <p className="text-3xl font-bold tracking-tight text-navy">{next.title}</p>
            <p className="max-w-md">The highest-voted proposal is now the current fundraising goal.</p>
            <LinkButton href={`/donate/${next.slug}`} variant="primary">
              Explore the next goal
            </LinkButton>
          </>
        ) : (
          <>
            <p className="max-w-md">
              The vote for the next goal was tied, so the club committee will publish its decision soon. No goal is chosen
              automatically.
            </p>
            <LinkButton href="/donate">Back to Donate</LinkButton>
          </>
        )}
      </PageBody>
    </>
  );
}
