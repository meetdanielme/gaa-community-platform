import Link from "next/link";
import type { ReactNode } from "react";

/** Building blocks for admin pages (server components). */

export function AdminPage({
  title,
  description,
  actions,
  back,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {back && (
            <Link href={back.href} className="text-sm font-semibold text-navy hover:underline">
              ← {back.label}
            </Link>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </main>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-card bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold text-navy">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="overflow-x-auto rounded-card bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-paper text-xs tracking-wide text-muted uppercase">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-paper">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={head.length} className="px-5 py-8 text-center text-muted">
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-3 align-middle ${className}`}>{children}</td>;
}

const pillTones = {
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-800",
  grey: "bg-paper text-muted",
  navy: "bg-pale text-navy",
};

export function Pill({ tone = "grey", children }: { tone?: keyof typeof pillTones; children: ReactNode }) {
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${pillTones[tone]}`}>{children}</span>;
}
