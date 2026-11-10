import type { Metadata } from "next";
import { AdminPage } from "../../ui";
import { GoalForm } from "../goal-form";

export const metadata: Metadata = { title: "Propose a goal" };

export default function NewGoalPage() {
  return (
    <AdminPage
      title="Propose a goal"
      description="New proposals go straight onto the members' ballot. Show exactly where the money goes — it's what members trust."
      back={{ href: "/admin/goals", label: "Fundraising" }}
    >
      <GoalForm />
    </AdminPage>
  );
}
