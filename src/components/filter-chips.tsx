import Link from "next/link";
import { codeColours } from "@/club.config";

/** A row of link chips for filtering a list by code, e.g. /feed?code=hurling. */
export function FilterChips({
  basePath,
  active,
  options,
}: {
  basePath: string;
  active?: string;
  options: { id: string; label: string }[];
}) {
  const chip = "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition";
  return (
    <nav aria-label="Filter by code" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link
        href={basePath}
        aria-current={!active ? "page" : undefined}
        className={`${chip} ${!active ? "bg-navy text-white" : "bg-white text-navy hover:bg-pale"}`}
      >
        All
      </Link>
      {options.map((o) => {
        const { colour, tint } = codeColours(o.id);
        const isActive = active === o.id;
        return (
          <Link
            key={o.id}
            href={`${basePath}?code=${o.id}`}
            aria-current={isActive ? "page" : undefined}
            className={`${chip} hover:brightness-95`}
            style={isActive ? { backgroundColor: colour, color: "white" } : { backgroundColor: tint, color: colour }}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
