import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "./app-shell";
import { BackIcon } from "./icons";

/** Figma "Navigation header": title, optional back link and action. */
export function PageHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-18 items-center gap-3 bg-white/95 px-4 backdrop-blur sm:px-10 lg:h-22">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="grid size-11 place-items-center rounded-full bg-white text-navy shadow-md hover:bg-paper"
        >
          <BackIcon />
        </Link>
      )}
      {!backHref && <Badge size={30} className="lg:hidden" />}
      <h1 className={`flex-1 font-bold tracking-tight ${backHref ? "text-2xl" : "text-3xl"}`}>{title}</h1>
      {action}
    </header>
  );
}

export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`px-4 py-6 sm:px-10 lg:py-8 ${className}`}>{children}</main>;
}

export function RoundIconButton(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className="grid size-11 place-items-center rounded-full bg-white text-navy shadow-md hover:bg-paper"
    />
  );
}
