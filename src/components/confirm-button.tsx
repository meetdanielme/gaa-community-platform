"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Sheet } from "./sheet";
import { Button } from "./ui";

/**
 * A button that asks for confirmation in a sheet, then runs a Server Action.
 * Pass a bound action, e.g. `deletePostAction.bind(null, post.id)`.
 */
export function ConfirmButton({
  label,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  action,
  destructive = true,
  variant = "ghost",
  size = "md",
}: {
  label: ReactNode;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  action: () => Promise<unknown>;
  destructive?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={destructive && variant === "ghost" ? "text-red-700 dark:text-red-300" : ""}
      >
        {label}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="flex flex-col gap-3 text-ink">{children}</div>
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await action();
              setOpen(false);
            })
          }
          className={destructive ? "bg-red-700 hover:bg-red-800" : ""}
        >
          {pending ? "Working…" : confirmLabel}
        </Button>
        <Button onClick={() => setOpen(false)}>{cancelLabel}</Button>
      </Sheet>
    </>
  );
}
