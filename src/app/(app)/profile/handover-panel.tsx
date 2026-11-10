"use client";

import { useState, useTransition } from "react";
import { Field, Input } from "@/components/form";
import { Sheet } from "@/components/sheet";
import { Button, Card, Notice } from "@/components/ui";
import { cancelHandoverAction, inviteHandoverAction, type HandoverResult } from "./actions";

/**
 * Hands an adult linked member over to their own account: the family (or a
 * club admin) sends them an invitation link by email.
 */
export function HandoverPanel({
  memberId,
  memberName,
  pending,
  adminView = false,
}: {
  memberId: string;
  memberName: string;
  /** A pending invitation, with its expiry already formatted. */
  pending: { email: string; expires: string } | null;
  adminView?: boolean;
}) {
  const firstName = memberName.split(" ")[0];
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(pending?.email ?? "");
  const [result, setResult] = useState<HandoverResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setResult(null);
    setCopied(false);
  };

  return (
    <Card className={`flex flex-col gap-3 ${adminView ? "bg-paper" : ""}`}>
      <h3 className="font-bold">{adminView ? "Own account" : `${firstName} can manage their own profile`}</h3>
      {pending ? (
        <p className="text-sm text-muted">
          Invitation sent to <strong className="text-ink">{pending.email}</strong>. The link works until {pending.expires}.
        </p>
      ) : (
        <p className="text-sm text-muted">
          {firstName} is an adult, so they can have their own account. Their memberships, fees and event responses move
          with them, and they&apos;ll no longer be managed from {adminView ? "this family account" : "your account"}.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={pending ? "secondary" : "primary"} onClick={() => setOpen(true)}>
          {pending ? "Send again" : `Give ${firstName} their own account`}
        </Button>
        {pending && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => startTransition(() => cancelHandoverAction(memberId))}
          >
            Cancel invitation
          </Button>
        )}
      </div>

      <Sheet open={open} onClose={close} title={result?.ok ? "Invitation sent" : `Invite ${firstName}`}>
        {result?.ok ? (
          <>
            <p>
              We&apos;ve emailed <strong>{result.email}</strong> a link to take over {memberName}&apos;s profile. They
              create an account (or sign in) with that address, then accept.
            </p>
            <p className="text-sm text-muted">You can also send them the link yourself:</p>
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(result.link);
                setCopied(true);
              }}
            >
              {copied ? "Link copied" : "Copy invitation link"}
            </Button>
            <Button variant="primary" onClick={close}>
              OK
            </Button>
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => setResult(await inviteHandoverAction(memberId, email)));
            }}
          >
            <p className="text-sm text-muted">
              Use {firstName}&apos;s own email address. Until they accept, nothing changes.
            </p>
            <Field label={`${firstName}'s email`}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} />
            </Field>
            {result && !result.ok && <Notice tone="error">{result.error}</Notice>}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Sending…" : "Send invitation"}
            </Button>
          </form>
        )}
      </Sheet>
    </Card>
  );
}
