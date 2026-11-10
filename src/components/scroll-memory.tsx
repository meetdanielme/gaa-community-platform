"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const storageKey = () => `scroll:${location.pathname}${location.search}`;

function read(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null; // Storage blocked (e.g. private mode): just don't restore.
  }
}

function write(key: string, y: number) {
  try {
    sessionStorage.setItem(key, String(Math.round(y)));
  } catch {}
}

/**
 * Remembers how far down each page you scrolled, so coming back to it (with
 * the back button, a back link or the tab bar) puts you where you left off.
 * Main tab pages (Feed, Events…) always restore; detail pages restore on
 * browser back/forward, so opening an event fresh still starts at the top.
 */
export function ScrollMemory() {
  const pathname = usePathname();
  const popped = useRef(false);

  useEffect(() => {
    const onPop = () => (popped.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const isTabPage = pathname.split("/").filter(Boolean).length <= 1;
    const saved = read(storageKey());
    let frame = 0;
    if (saved && !location.hash && (isTabPage || popped.current)) {
      // Wait for Next.js to finish its own scroll handling for the new page.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
      });
    }
    popped.current = false;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      // Read the URL at write time, so filter changes (?code=) get their own entry.
      timer = setTimeout(() => write(storageKey(), window.scrollY), 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}
