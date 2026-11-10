"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clubConfig } from "@/club.config";
import { authClient } from "@/lib/auth-client";
import { CalendarIcon, FeedIcon, HeartIcon, PersonIcon, SignOutIcon } from "./icons";

const nav = [
  { href: "/feed", label: "Feed", Icon: FeedIcon },
  { href: "/events", label: "Events", Icon: CalendarIcon },
  { href: "/donate", label: "Donate", Icon: HeartIcon },
  { href: "/profile", label: "Profile", Icon: PersonIcon },
] as const;

export function Wordmark() {
  return (
    <span className="inline-flex flex-col gap-2">
      <span className="text-2xl font-extrabold tracking-tight text-navy uppercase">{clubConfig.name}</span>
      <span className="h-1 w-10 rounded-full bg-gold" />
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:pl-56">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col bg-white px-5 py-7 lg:flex">
        <Link href="/feed" aria-label={`${clubConfig.name} home`} className="px-2">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="mt-12 flex flex-col gap-2">
          {nav.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex h-13 items-center gap-3 rounded-full px-4 font-semibold text-navy transition hover:bg-paper ${
                isActive(href) ? "bg-[#e1edf6]" : ""
              }`}
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="mt-auto flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium text-muted hover:bg-paper"
        >
          <SignOutIcon className="size-5" />
          Sign out
        </button>
      </aside>

      <div className="pb-28 lg:pb-0">{children}</div>

      {/* Mobile floating tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-4 bottom-4 z-10 flex h-17 items-center justify-around rounded-full border border-white/60 bg-white/85 shadow-lg backdrop-blur-xl lg:hidden"
      >
        {nav.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-1.5 text-xs font-semibold ${
              isActive(href) ? "bg-[#e1edf6] text-navy" : "text-muted"
            }`}
          >
            <Icon className="size-6" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
