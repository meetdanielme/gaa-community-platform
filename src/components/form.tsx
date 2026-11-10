import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "h-12 w-full rounded-xl border border-[#d5dee5] bg-white px-4 text-base text-ink placeholder:text-muted/70 focus:border-navy focus:outline-2 focus:outline-navy/20 read-only:bg-paper";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-red-700">{error}</span>
      ) : (
        hint && <span className="text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
