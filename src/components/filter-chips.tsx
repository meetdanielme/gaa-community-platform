import Link from "next/link";
import type { CSSProperties } from "react";
import { codeColours } from "@/club.config";

/** A row of link chips for filtering a list by code, e.g. /feed?code=hurling. */
export function FilterChips({
  basePath,
  active,
  options,
  extraParams,
}: {
  basePath: string;
  active?: string;
  options: { id: string; label: string }[];
  /** Other filters to keep when switching code, e.g. { type: "Match report" } */
  extraParams?: Record<string, string>;
}) {
  const href = (code?: string) => {
    const q = new URLSearchParams({ ...(code ? { code } : {}), ...extraParams }).toString();
    return q ? `${basePath}?${q}` : basePath;
  };
  const chip = "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition";
  return (
    <nav aria-label="Filter by code" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link
        href={href()}
        aria-current={!active ? "page" : undefined}
        className={`${chip} ${!active ? "bg-brand text-white" : "bg-surface text-navy hover:bg-pale"}`}
      >
        All
      </Link>
      {options.map((o) => {
        const { colour, tint } = codeColours(o.id);
        const isActive = active === o.id;
        return (
          <Link
            key={o.id}
            href={href(o.id)}
            aria-current={isActive ? "page" : undefined}
            className={`${chip} hover:brightness-95 ${isActive ? "text-white" : "tinted"}`}
            style={isActive ? { backgroundColor: colour } : ({ "--fg": colour, "--bg": tint } as CSSProperties)}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
