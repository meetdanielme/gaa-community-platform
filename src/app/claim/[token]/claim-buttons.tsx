"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { claimAction, type ClaimResult } from "../actions";

export function AcceptButton({ token, memberName }: { token: string; memberName: string }) {
  const [result, setResult] = useState<ClaimResult>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      {result && <Notice tone="error">{result.error}</Notice>}
      <Button variant="primary" disabled={pending} onClick={() => startTransition(async () => setResult(await claimAction(token)))}>
        {pending ? "Moving your profile…" : `Take over ${memberName}'s profile`}
      </Button>
    </>
  );
}

/** Signed in with the wrong account: sign out and come back to this page. */
export function SwitchAccountButton() {
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        await authClient.signOut();
        router.refresh();
      }}
    >
      Sign out and switch account
    </Button>
  );
}
