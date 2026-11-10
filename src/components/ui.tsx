import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Buttons — Figma "Saints Hi-fi / Button / primary | secondary | gold" */

type Variant = "primary" | "secondary" | "gold" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy/90",
  secondary: "bg-pale text-navy hover:bg-[#dbe6ec]",
  gold: "bg-gold text-navy hover:brightness-95",
  ghost: "text-navy hover:bg-pale",
};

type Size = "md" | "sm";

const sizes: Record<Size, string> = {
  md: "min-h-13 px-5 text-base",
  sm: "min-h-11 px-4 text-sm",
};

export function buttonClass(variant: Variant = "secondary", extra = "", size: Size = "md") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition",
    sizes[size],
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    extra,
  ].join(" ");
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, className, size)} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/* Surfaces */

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-card bg-white p-5 ${className}`} {...props} />;
}

export function Tag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold tracking-wide text-white uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={`${pct}% funded`}
      className="h-2 w-full overflow-hidden rounded-full bg-pale"
    >
      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DetailRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted">{r.label}</dt>
          <dd className="text-right font-semibold text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-pale text-navy",
    error: "bg-red-50 text-red-800",
    success: "bg-emerald-50 text-emerald-800",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}
