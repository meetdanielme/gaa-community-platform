import type { ComponentProps, ReactNode } from "react";
import { limitHint, type Limit } from "@/lib/limits";

export const inputClass =
  "h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-4 text-base text-ink placeholder:text-muted/70 focus:border-navy focus:outline-2 focus:outline-navy/20 read-only:bg-paper";

export const textareaClass =
  "min-h-32 w-full min-w-0 rounded-xl border border-line bg-surface px-4 py-3 text-base focus:border-navy focus:outline-2 focus:outline-navy/20";

export function Field({
  label,
  hint,
  limit,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  /** Shows the allowed length, e.g. "3–100 characters". Pass the same limit to the input. */
  limit?: Limit;
  error?: string;
  children: ReactNode;
}) {
  if (limit) hint = hint ? <>{hint} {limitHint(limit)}.</> : `${limitHint(limit)}.`;
  // Hints and errors sit outside the <label> so they don't become part of
  // the input's accessible name.
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {children}
      </label>
      {error ? (
        <span role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-muted">{hint}</span>
      )}
    </div>
  );
}

/** Min/max length attributes for a [min, max] limit (min 0 = optional). */
export function lengthProps([min, max]: Limit) {
  return { minLength: min || undefined, maxLength: max, required: min > 0 };
}

export function Input({ limit, ...props }: ComponentProps<"input"> & { limit?: Limit }) {
  return <input {...(limit ? lengthProps(limit) : {})} {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
