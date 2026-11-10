import Link from "next/link";
import { FilterIcon } from "./icons";

/**
 * The round filter button in a page header, opening a list of choices
 * (e.g. Events by code, Feed by post type). Built on <details>, so it works
 * without JavaScript.
 */
export function FilterMenu({
  label,
  heading,
  all,
  options,
  active,
}: {
  /** Accessible name for the button, e.g. "Filter events by code" */
  label: string;
  heading: string;
  all: { label: string; href: string };
  options: { id: string; label: string; href: string }[];
  active?: string;
}) {
  const item = (on: boolean) => `block rounded-xl px-3 py-2.5 font-medium hover:bg-paper ${on ? "bg-pale text-navy" : ""}`;
  return (
    <details className="relative">
      <summary
        aria-label={label}
        className={`relative grid size-11 cursor-pointer list-none place-items-center rounded-full bg-surface text-navy shadow-md hover:bg-paper [&::-webkit-details-marker]:hidden`}
      >
        <FilterIcon />
        {active && <span aria-hidden className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-gold ring-2 ring-surface" />}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-3xl bg-surface p-3 shadow-xl">
        <p className="px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">{heading}</p>
        <Link href={all.href} aria-current={!active ? "true" : undefined} className={item(!active)}>
          {all.label}
        </Link>
        {options.map((o) => (
          <Link key={o.id} href={o.href} aria-current={active === o.id ? "true" : undefined} className={item(active === o.id)}>
            {o.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
