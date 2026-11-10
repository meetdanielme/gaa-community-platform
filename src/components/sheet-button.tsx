"use client";

import { useState, type ReactNode } from "react";
import { Sheet } from "./sheet";
import { Button } from "./ui";

/** A button that opens its children (usually a form) in a sheet. */
export function SheetButton({
  label,
  title,
  children,
  variant = "secondary",
  size = "md",
}: {
  label: ReactNode;
  title: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Sheet>
    </>
  );
}
