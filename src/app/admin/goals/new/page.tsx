import type { Metadata } from "next";
import { AdminPage } from "../../ui";
import { GoalForm } from "../goal-form";

export const metadata: Metadata = { title: "Propose a goal" };

export default function NewGoalPage() {
  return (
    <AdminPage
      title="Propose a goal"
      back={{ href: "/admin/goals", label: "Fundraising" }}
    >
      <GoalForm />
    </AdminPage>
  );
}
