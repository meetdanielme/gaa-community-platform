"use client";

import { Fragment, useState, type ReactNode } from "react";
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
  // A fresh form each time the sheet opens, without the last save's message.
  const [opened, setOpened] = useState(0);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setOpened((n) => n + 1);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <Fragment key={opened}>{children}</Fragment>
      </Sheet>
    </>
  );
}
