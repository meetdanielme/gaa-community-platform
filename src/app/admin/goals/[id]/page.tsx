import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Notice } from "@/components/ui";
import { getGoalAdmin } from "@/server/admin/fundraising";
import { AdminPage } from "../../ui";
import { GoalForm } from "../goal-form";

export const metadata: Metadata = { title: "Edit goal" };

export default async function EditGoalPage({ params }: PageProps<"/admin/goals/[id]">) {
  const { id } = await params;
  const goal = await getGoalAdmin(id);
  if (!goal) notFound();
  return (
    <AdminPage
      title={goal.title}
      back={{ href: "/admin/goals", label: "Fundraising" }}
      description={
        <Link href={`/donate/${goal.slug}`} className="font-semibold text-navy hover:underline">
          View as members see it →
        </Link>
      }
    >
      {goal.status === "funded" ? (
        <Notice>This goal is fully funded, so its details are locked for the record.</Notice>
      ) : (
        <GoalForm goal={goal} />
      )}
    </AdminPage>
  );
}
