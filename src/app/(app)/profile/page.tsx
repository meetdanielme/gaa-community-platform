import type { Metadata } from "next";
import { clubConfig } from "@/club.config";
import { PlusIcon } from "@/components/icons";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, LinkButton, Tag } from "@/components/ui";
import { initials } from "@/lib/format";
import { memberSummary } from "@/lib/members";
import { roleLabels } from "@/lib/rules/roles";
import { requireUser } from "@/lib/session";
import { getFamily } from "@/server/profile";
import { EditContactButton } from "./edit-contact";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const family = await getFamily(user.id);
  const self = family.find((m) => m.relationship === "self");
  const linked = family.filter((m) => m.relationship !== "self");

  return (
    <>
      <PageHeader title="Profile" />
      <PageBody className="grid gap-6 lg:grid-cols-[minmax(0,390px)_1fr]">
        <section className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <span className="grid size-18 place-items-center rounded-full bg-navy text-2xl font-semibold text-white">
              {initials(user.name)}
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-navy">{user.name}</h2>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((r) => (
                <Tag key={r}>{roleLabels[r]}</Tag>
              ))}
            </div>
            <p className="text-sm text-muted">Together for the {clubConfig.season} season</p>
            {self && <p className="text-sm text-muted">{memberSummary(self)}</p>}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Contact details</h2>
            <p>{user.phone ?? <span className="text-muted">No phone number</span>}</p>
            <p>{user.email}</p>
            <p>{user.eircode ?? <span className="text-muted">No Eircode</span>}</p>
            <EditContactButton user={user} />
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">How you help</h2>
            <p>{user.helpsWith ?? <span className="text-muted">Tell the club how you&apos;d like to help.</span>}</p>
          </Card>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold tracking-tight">Your family at {clubConfig.name}</h2>
          {[...(self ? [self] : []), ...linked].map((m) => (
            <Card key={m.id} className="flex flex-col gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {m.fullName}
                  {m.relationship === "self" && <span className="font-normal text-muted"> (you)</span>}
                </p>
                <p className="mt-1 text-sm text-muted">{memberSummary(m) || "No team yet"}</p>
              </div>
              <LinkButton href={`/profile/members/${m.id}`}>View member</LinkButton>
            </Card>
          ))}
          <LinkButton href="/profile/members/new" variant="ghost" className="border-2 border-dashed border-pale">
            <PlusIcon /> Add a family member
          </LinkButton>
        </section>
      </PageBody>
    </>
  );
}
