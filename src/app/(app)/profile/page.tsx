import type { Metadata } from "next";
import { clubConfig } from "@/club.config";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, LinkButton, Tag } from "@/components/ui";
import { initials } from "@/lib/format";
import { memberSummary } from "@/lib/members";
import { roleLabels } from "@/lib/rules/roles";
import { requireUser } from "@/lib/session";
import { getFamily } from "@/server/profile";
import { listMyUpcomingEvents } from "@/server/events";
import { SignOutButton } from "@/components/app-shell";
import { PlusIcon, SettingsIcon } from "@/components/icons";
import { MyEventsList } from "../events/my-events";
import { AccountSecurity } from "./account-security";
import { EditContactButton } from "./edit-contact";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [family, upcoming] = await Promise.all([getFamily(user.id), listMyUpcomingEvents(user.id)]);
  const self = family.find((m) => m.relationship === "self");
  const linked = family.filter((m) => m.relationship !== "self");

  return (
    <>
      <PageHeader title="Profile" action={<SignOutButton className="lg:hidden" />} />
      <PageBody className="grid gap-6 lg:grid-cols-[minmax(0,390px)_1fr]">
        <section className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <span className="grid size-18 place-items-center rounded-full bg-brand text-2xl font-semibold text-white">
              {initials(user.name)}
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-navy">{user.name}</h2>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((r) => (
                <Tag key={r}>{roleLabels[r]}</Tag>
              ))}
            </div>
            {self && <p className="text-sm text-muted">{memberSummary(self)}</p>}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Contact details</h2>
            <p>{user.phone ?? <span className="text-muted">No phone number</span>}</p>
            <p>{user.email}</p>
            <p>{user.eircode ?? <span className="text-muted">No Eircode</span>}</p>
            <EditContactButton user={user} />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Your upcoming events</h2>
            {upcoming.length > 0 ? (
              <>
                <MyEventsList items={upcoming.slice(0, 3)} inset />
                {upcoming.length > 3 && (
                  <LinkButton href="/events#your-events">See all {upcoming.length} events</LinkButton>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted">You haven&apos;t signed up for any upcoming events yet.</p>
                <LinkButton href="/events">Browse events</LinkButton>
              </>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Your donations</h2>
            <LinkButton href="/profile/donations">View donation history</LinkButton>
          </Card>

          <ThemePicker />

          <AccountSecurity />

          {user.isAdmin && (
            <LinkButton href="/admin" className="lg:hidden">
              <SettingsIcon className="size-5" /> Club admin
            </LinkButton>
          )}
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
