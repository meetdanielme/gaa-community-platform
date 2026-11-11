"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clubConfig } from "@/club.config";
import { authClient } from "@/lib/auth-client";
import { ScrollMemory } from "./scroll-memory";
import { CalendarIcon, FeedIcon, HeartIcon, PersonIcon, SettingsIcon, SignOutIcon } from "./icons";

const nav = [
  { href: "/feed", label: "Feed", Icon: FeedIcon },
  { href: "/events", label: "Events", Icon: CalendarIcon },
  { href: "/donate", label: "Donate", Icon: HeartIcon },
  { href: "/profile", label: "Profile", Icon: PersonIcon },
] as const;

/**
 * Brand rule: the artwork only sits on white, so dark mode gives it a white
 * plate. Each plate's padding is cancelled by a matching negative margin, so
 * the plate grows outwards and the layout doesn't shift when the theme changes.
 */
const plate = "dark:box-content dark:bg-white";

/** The club logo lockup (artwork, per the brand guidelines). */
export function Logo({
  width = 176,
  priority = false,
  onWhite = false,
}: {
  width?: number;
  priority?: boolean;
  /** Already on a white background in every theme, so no plate is needed. */
  onWhite?: boolean;
}) {
  const { src, width: w, height: h } = clubConfig.logo;
  return (
    <Image
      src={src}
      alt={clubConfig.fullName}
      width={width}
      height={Math.round((width * h) / w)}
      priority={priority}
      className={onWhite ? "" : `${plate} dark:-mx-3 dark:-my-2 dark:rounded-xl dark:px-3 dark:py-2`}
    />
  );
}

/** The compact shield badge. */
export function Badge({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src={clubConfig.badge.src}
      alt=""
      width={size}
      height={size}
      className={`${plate} dark:-m-0.5 dark:rounded-full dark:p-0.5 ${className}`}
    />
  );
}

function useSignOut() {
  const router = useRouter();
  return async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };
}

/** Sign out, for places the desktop sidebar isn't shown (e.g. Profile on phones). */
export function SignOutButton({ className = "" }: { className?: string }) {
  const signOut = useSignOut();
  return (
    <button
      type="button"
      onClick={signOut}
      className={`flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-navy shadow-md hover:bg-paper ${className}`}
    >
      <SignOutIcon className="size-5" />
      Sign out
    </button>
  );
}

export function AppShell({ children, isAdmin = false }: { children: ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh lg:pl-56">
      <ScrollMemory />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col bg-surface px-5 py-7 lg:flex">
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
                isActive(href) ? "bg-nav-active" : ""
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
        className="fixed inset-x-4 bottom-4 z-10 flex h-17 items-center justify-around rounded-full border border-surface/60 bg-surface/85 shadow-lg backdrop-blur-xl lg:hidden"
      >
        {nav.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-1.5 text-xs font-semibold ${
              isActive(href) ? "bg-nav-active text-navy" : "text-muted"
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
