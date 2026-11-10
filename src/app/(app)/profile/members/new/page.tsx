import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { saveMemberAction } from "../../actions";
import { MemberForm } from "../../member-form";

export const metadata: Metadata = { title: "Add a family member" };

export default async function NewMemberPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Add a family member" backHref="/profile" />
      <PageBody className="max-w-xl">
        <p className="mb-6 text-muted">
          Link a child or relative so you can respond to events and pay membership on their behalf. Only you and club
          officers can see this profile.
        </p>
        <Card>
          <MemberForm action={saveMemberAction} />
        </Card>
      </PageBody>
    </>
  );
}
