import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { MemberForm } from "../../member-form";

export const metadata: Metadata = { title: "Add a family member" };

export default async function NewMemberPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Add a family member" backHref="/profile" />
      <PageBody className="max-w-xl">
        <p className="mb-6 text-muted">
          Link a child or relative so you can respond to events and pay membership on their behalf. Only you can see and
          manage this profile.
        </p>
        <Card>
          <MemberForm />
        </Card>
      </PageBody>
    </>
  );
}
