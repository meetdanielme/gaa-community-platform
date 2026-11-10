import Link from "next/link";
import type { Metadata } from "next";
import { clubConfig } from "@/club.config";
import { Logo } from "@/components/app-shell";
import { LinkButton, Notice } from "@/components/ui";
import { formatLongDate } from "@/lib/format";
import { claimMessages } from "@/lib/rules/handover";
import { getSession } from "@/lib/session";
import { claimPath, getHandoverByToken } from "@/server/handover";
import { AcceptButton, SwitchAccountButton } from "./claim-buttons";

export const metadata: Metadata = { title: "Your member profile" };

/* Accept an invitation to manage your own member profile (sent by your family or the club). */
export default async function ClaimPage({ params }: PageProps<"/claim/[token]">) {
  const { token } = await params;
  const [found, session] = await Promise.all([getHandoverByToken(token), getSession()]);
  const invite = found?.invite;
  const problem = !invite
    ? claimMessages.not_found
    : invite.acceptedAt
      ? claimMessages.already_claimed
      : invite.expiresAt < new Date()
        ? claimMessages.expired
        : null;
  const signedInAs = session?.user.email.toLowerCase();
  const back = new URLSearchParams({ next: claimPath(token), email: invite?.email ?? "" });

  return (
    <div className="flex min-h-dvh flex-col items-center bg-paper px-4 py-10">
      <Link href="/" aria-label="Home" className="mb-10">
        <Logo width={220} priority />
      </Link>
      <main className="flex w-full max-w-md flex-col gap-5 rounded-card bg-surface p-6 sm:p-8">
        {problem || !found || !invite ? (
          <>
            <h1 className="text-2xl font-bold">This link can&apos;t be used</h1>
            <Notice tone="error">{problem}</Notice>
            <LinkButton href={session ? "/profile" : "/sign-in"}>{session ? "Go to your profile" : "Sign in"}</LinkButton>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold">Manage your own profile</h1>
              <p className="mt-2 text-muted">
                {found.managerName ?? "Your family"} has invited <strong className="text-ink">{found.memberName}</strong>{" "}
                to have their own {clubConfig.name} account. Your memberships, fees and event responses come with you.
              </p>
            </div>
            {!session ? (
              <>
                <p className="text-sm">
                  Create an account (or sign in) with <strong>{invite.email}</strong>, then come back here to accept.
                </p>
                <LinkButton href={`/sign-up?${back}`} variant="primary">
                  Create my account
                </LinkButton>
                <LinkButton href={`/sign-in?${back}`}>I already have an account</LinkButton>
              </>
            ) : signedInAs !== invite.email ? (
              <>
                <Notice tone="error">
                  You&apos;re signed in as {session.user.email}, but this invitation is for {invite.email}.
                </Notice>
                <SwitchAccountButton />
              </>
            ) : (
              <>
                <p className="text-sm">
                  Signed in as <strong>{session.user.email}</strong>. Once you accept, {found.managerName ?? "your family"}{" "}
                  will no longer manage this profile.
                </p>
                <AcceptButton token={token} memberName={found.memberName} />
              </>
            )}
            <p className="text-xs text-muted">This invitation expires on {formatLongDate(invite.expiresAt)}.</p>
          </>
        )}
      </main>
    </div>
  );
}
