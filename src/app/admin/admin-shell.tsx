"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Badge, Logo } from "@/components/app-shell";
import { Sheet } from "@/components/sheet";
import {
  BackIcon,
  CalendarIcon,
  DashboardIcon,
  FeedIcon,
  HeartIcon,
  MoreIcon,
  PeopleIcon,
  ReceiptIcon,
} from "@/components/icons";

const nav: { href: string; label: string; short?: string; Icon: (p: { className?: string }) => ReactNode }[] = [
  { href: "/admin", label: "Dashboard", short: "Home", Icon: DashboardIcon },
  { href: "/admin/posts", label: "Posts", Icon: FeedIcon },
  { href: "/admin/events", label: "Events", Icon: CalendarIcon },
  { href: "/admin/goals", label: "Fundraising", Icon: HeartIcon },
  { href: "/admin/donations", label: "Donations", Icon: ReceiptIcon },
  { href: "/admin/members", label: "Members", Icon: PeopleIcon },
];

/** Phones: the busiest sections get a tab; the rest sit under "More". */
const tabs = ["/admin", "/admin/posts", "/admin/events", "/admin/members"];
const tabNav = nav.filter((n) => tabs.includes(n.href));
const moreNav = nav.filter((n) => !tabs.includes(n.href));

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

      {/* Phones: a slim brand bar on top and a tab bar at the bottom */}
      <header className="flex items-center gap-3 bg-brand px-4 py-2.5 text-white lg:hidden">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white">
          <Badge size={22} />
        </span>
        <span className="flex-1 text-sm font-semibold tracking-widest uppercase">Club admin</span>
        <Link href="/feed" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/85 hover:bg-white/10">
          <BackIcon className="size-4" /> App
        </Link>
      </header>
      <AdminTabBar active={active} />
      <div className="pb-28 lg:pb-0">{children}</div>
    </div>
  );
}

function AdminTabBar({ active }: { active: (href: string) => boolean }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = moreNav.some((n) => active(n.href));
  const tabClass = (on: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-xs font-semibold ${
      on ? "bg-nav-active text-navy" : "text-muted"
    }`;
  return (
    <>
      <nav
        aria-label="Admin"
        className="fixed inset-x-4 bottom-4 z-10 flex h-17 items-center gap-1 rounded-full border border-surface/60 bg-surface/85 px-2 shadow-lg backdrop-blur-xl lg:hidden"
      >
        {tabNav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={tabClass(active(n.href))}>
            <n.Icon className="size-6 shrink-0" />
            <span className="max-w-full truncate">{n.short ?? n.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(inMore)} aria-haspopup="dialog">
          <MoreIcon className="size-6 shrink-0" />
          More
        </button>
      </nav>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <nav aria-label="More admin" className="flex flex-col gap-1">
          {moreNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMoreOpen(false)}
              aria-current={active(n.href) ? "page" : undefined}
              className={`flex h-13 items-center gap-3 rounded-2xl px-4 font-semibold text-navy hover:bg-paper ${
                active(n.href) ? "bg-nav-active" : ""
              }`}
            >
              <n.Icon className="size-5 shrink-0" />
              {n.label}
            </Link>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
