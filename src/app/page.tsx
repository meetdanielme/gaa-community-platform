import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clubConfig } from "@/club.config";
import { Wordmark } from "@/components/app-shell";
import { buttonClass } from "@/components/ui";
import { DemoSignInButton } from "@/components/demo-sign-in";
import { getSession } from "@/lib/session";

const features = [
  {
    title: "One feed for four codes",
    body: "Club updates, match reports and events from hurling, football, camogie and ladies' football, all in one place.",
  },
  {
    title: "Family profiles",
    body: "Manage linked profiles, respond to events for your children and pay membership fees.",
  },
  {
    title: "Donations and voting",
    body: "See exactly where donations go and vote on the club's next fundraising goal.",
  },
];

export default async function LandingPage() {
  if (await getSession()) redirect("/feed");

  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <Wordmark />
        <Link href="/sign-in" className="font-semibold text-navy hover:underline">
          Sign in
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-16 sm:px-8 lg:grid-cols-2 lg:pt-16">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-semibold tracking-widest text-muted uppercase">
              {clubConfig.fullName} · {clubConfig.season}
            </p>
            <h1 className="text-5xl leading-[1.05] font-bold tracking-tight text-ink sm:text-6xl">
              {clubConfig.tagline}
            </h1>
            <p className="max-w-md text-lg text-muted">{clubConfig.description}</p>
            {clubConfig.demoMode ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <DemoSignInButton />
                  <DemoSignInButton as="admin" />
                </div>
                <p className="text-sm text-muted">
                  Explore as Evan, a family supporter with three linked members, or as Aoife, the club secretary who
                  runs the admin side. Payments are simulated and the demo resets every night.{" "}
                  <Link href="/sign-up" className="font-semibold text-navy hover:underline">
                    Or create your own account
                  </Link>
                  .
                </p>
              </>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/sign-up" className={buttonClass("primary", "sm:w-48")}>
                  Join the club
                </Link>
                <Link href="/sign-in" className={buttonClass("secondary", "sm:w-48")}>
                  Sign in
                </Link>
              </div>
            )}
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
            <Image
              src="/images/sliotar.jpg"
              alt="A sliotar resting in the grass"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="bg-paper">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:px-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-card bg-white p-6">
                <h2 className="text-lg font-bold text-navy">{f.title}</h2>
                <p className="mt-2 text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-8">
        Built by IS2204 Group 16 at University College Cork as an open-source, white-label platform for GAA
        clubs. Photography: Adrian Payne, Rémi Müller and enrico bet on Unsplash.
      </footer>
    </div>
  );
}
