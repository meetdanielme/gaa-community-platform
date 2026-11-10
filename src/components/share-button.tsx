"use client";

import { useState } from "react";
import { ShareIcon } from "./icons";
import { Sheet } from "./sheet";
import { Button } from "./ui";

/** Uses the native share sheet where available, otherwise copies the link. */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Cancelled or unsupported — fall back to copying.
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label={`Share ${title}`}
        className="grid size-11 place-items-center rounded-full bg-surface text-navy shadow-md hover:bg-paper"
      >
        <ShareIcon />
      </button>
      <Sheet open={copied} onClose={() => setCopied(false)} title="Link copied">
        <p className="text-muted">Paste it into a message or your family group chat to spread the word.</p>
        <Button variant="primary" onClick={() => setCopied(false)}>
          Done
        </Button>
      </Sheet>
    </>
  );
}
