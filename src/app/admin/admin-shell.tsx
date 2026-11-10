"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/app-shell";
import {
  BackIcon,
  CalendarIcon,
  DashboardIcon,
  FeedIcon,
  HeartIcon,
  PeopleIcon,
  ReceiptIcon,
} from "@/components/icons";

const nav = [
  { href: "/admin", label: "Dashboard", Icon: DashboardIcon },
  { href: "/admin/posts", label: "Posts", Icon: FeedIcon },
  { href: "/admin/events", label: "Events", Icon: CalendarIcon },
  { href: "/admin/goals", label: "Fundraising", Icon: HeartIcon },
  { href: "/admin/donations", label: "Donations", Icon: ReceiptIcon },
  { href: "/admin/members", label: "Members", Icon: PeopleIcon },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <div className="min-h-dvh lg:pl-56">
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col bg-brand px-5 py-7 text-white lg:flex">
        <Link href="/admin" className="rounded-2xl bg-white px-3 py-3" aria-label="Admin dashboard">
          <Logo width={160} onWhite />
        </Link>
        <p className="mt-3 px-2 text-xs font-semibold tracking-widest text-white/60 uppercase">Club admin</p>
        <nav aria-label="Admin" className="mt-8 flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 font-semibold transition hover:bg-white/10 ${active(n.href) ? "bg-white/15" : ""}`}
            >
              <n.Icon className="size-5 shrink-0" />
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/feed" className="mt-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-white/80 hover:bg-white/10">
          <BackIcon className="size-4" /> Back to the app
        </Link>
      </aside>

      {/* Mobile: horizontal admin nav */}
      <nav aria-label="Admin" className="sticky top-0 z-20 flex gap-1 overflow-x-auto bg-brand px-3 py-2 lg:hidden">
        <Link href="/feed" className="shrink-0 rounded-full px-3 py-2 text-sm text-white/80">
          ← App
        </Link>
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-white ${active(n.href) ? "bg-white/15" : ""}`}
          >
            <n.Icon className="size-4" />
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
