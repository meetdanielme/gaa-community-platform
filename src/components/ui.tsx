import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { codeColours, codeLabel, postKindStyle, type PostKindIcon } from "@/club.config";
import { CameraIcon, HeartIcon, MegaphoneIcon, TrophyIcon, WhistleIcon } from "./icons";

/* Buttons — Figma "Saints Hi-fi / Button / primary | secondary | gold" */

type Variant = "primary" | "secondary" | "gold" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand/90",
  secondary: "bg-pale text-navy hover:bg-pale-hover",
  // Navy on yellow in every theme (the lightened dark-mode navy is unreadable on gold).
  gold: "bg-gold text-[var(--brand-primary)] hover:brightness-95",
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
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, className, size)} {...props} />;
}

/* Surfaces */

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-card bg-surface p-5 ${className}`} {...props} />;
}

export function Tag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold tracking-wide text-white uppercase ${className}`}
    >
      {children}
    </span>
  );
}

/** Which code (or club-wide category) something belongs to: a coloured pill. */
export function CodeTag({ code, className = "" }: { code: string | null | undefined; className?: string }) {
  const { colour, tint } = codeColours(code);
  return (
    <span
      className={`tinted inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ "--fg": colour, "--bg": tint } as CSSProperties}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {codeLabel(code)}
    </span>
  );
}

const kindIcons: Record<PostKindIcon, (p: { className?: string }) => ReactNode> = {
  megaphone: MegaphoneIcon,
  trophy: TrophyIcon,
  whistle: WhistleIcon,
  heart: HeartIcon,
  camera: CameraIcon,
};

/**
 * What kind of post something is ("Club update", "Match report"): an icon
 * and colour per type (see postKinds in club.config), so types are easy to
 * tell apart at a glance.
 */
export function KindLabel({ kind, className = "" }: { kind: string; className?: string }) {
  const { icon, colour, tint } = postKindStyle(kind);
  const Icon = kindIcons[icon];
  return (
    <span
      className={`tinted inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${className}`}
      style={{ "--fg": colour, "--bg": tint } as CSSProperties}
    >
      <Icon className="size-4" />
      {kind}
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
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted">{r.label}</dt>
          <dd className="min-w-0 text-right font-semibold break-words text-ink">{r.value}</dd>
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
    error: "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200",
    success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}
