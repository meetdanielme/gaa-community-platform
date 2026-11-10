"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clubConfig } from "@/club.config";
import { authClient } from "@/lib/auth-client";
import { CalendarIcon, FeedIcon, HeartIcon, PersonIcon, SettingsIcon, SignOutIcon } from "./icons";

const nav = [
  { href: "/feed", label: "Feed", Icon: FeedIcon },
  { href: "/events", label: "Events", Icon: CalendarIcon },
  { href: "/donate", label: "Donate", Icon: HeartIcon },
  { href: "/profile", label: "Profile", Icon: PersonIcon },
] as const;

/** The club logo lockup (artwork, per the brand guidelines). */
export function Logo({ width = 176, priority = false }: { width?: number; priority?: boolean }) {
  const { src, width: w, height: h } = clubConfig.logo;
  return <Image src={src} alt={clubConfig.fullName} width={width} height={Math.round((width * h) / w)} priority={priority} />;
}

/** The compact shield badge. */
export function Badge({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <Image src={clubConfig.badge.src} alt="" width={size} height={size} className={className} />;
}

export function AppShell({ children, isAdmin = false }: { children: ReactNode; isAdmin?: boolean }) {
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
          <Logo width={164} priority />
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
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-auto flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold text-navy hover:bg-paper"
          >
            <SettingsIcon className="size-5" />
            Club admin
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className={`${isAdmin ? "" : "mt-auto "}flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium text-muted hover:bg-paper`}
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
