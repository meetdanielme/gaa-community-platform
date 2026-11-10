"use client";

import { createContext, useEffect, useRef, type ReactNode } from "react";
import { BackIcon, CloseIcon } from "./icons";

/** Lets content inside a sheet close it, e.g. a form once it has saved. */
export const SheetContext = createContext<{ close: () => void } | null>(null);

/**
 * A modal sheet: a bottom sheet on phones and a centred dialog on larger
 * screens, matching the Figma "Sheet / *" frames. Built on <dialog> for
 * focus trapping, Escape-to-close and accessibility for free.
 */
export function Sheet({
  open,
  onClose,
  onBack,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Only user-initiated closes (Escape, backdrop, close button) call
      // onClose. The native `close` event also fires when we close the
      // dialog programmatically, e.g. when one sheet hands over to the next.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-surface p-0 text-ink shadow-2xl sm:m-auto sm:max-w-[440px] sm:rounded-3xl"
    >
      <div className="flex flex-col gap-4 p-6 pb-8">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="grid size-11 place-items-center rounded-full bg-paper text-navy hover:bg-pale"
            >
              <BackIcon />
            </button>
          )}
          <h2 className="flex-1 text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-full bg-paper text-navy hover:bg-pale"
          >
            <CloseIcon />
          </button>
        </div>
        <SheetContext value={{ close: onClose }}>{children}</SheetContext>
      </div>
    </dialog>
  );
}
