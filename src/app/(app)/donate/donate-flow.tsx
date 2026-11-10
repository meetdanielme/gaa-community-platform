"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { clubConfig } from "@/club.config";
import { HeartIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Button, Notice, buttonClass } from "@/components/ui";
import { formatMoney, parseEuros } from "@/lib/format";
import { donateAction, type DonationActionResult } from "./actions";

type Method = { id: string; label: string; note: string };

type Step =
  | { kind: "closed" }
  | { kind: "amount"; error?: string }
  | { kind: "review" }
  | { kind: "method" }
  | { kind: "result"; result: DonationActionResult };

/* UC6 — Make a donation (Figma "Sheet / amount → review → payment → thanks"). */
export function DonateFlow({
  goal,
  methods,
  canDonate,
}: {
  goal: { id: string; title: string };
  methods: Method[];
  canDonate: boolean;
}) {
  const [step, setStep] = useState<Step>({ kind: "closed" });
  const [amountCents, setAmountCents] = useState<number>(clubConfig.donationPresetsCents[1]);
  const [custom, setCustom] = useState("");
  const [methodId, setMethodId] = useState(methods[0].id);
  // One key per attempt: retrying the same attempt can never charge twice.
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [pending, startTransition] = useTransition();

  const method = methods.find((m) => m.id === methodId)!;
  const close = () => setStep({ kind: "closed" });

  function continueToReview() {
    let cents = amountCents;
    if (custom.trim()) {
      const parsed = parseEuros(custom);
      if (parsed === null) {
        setStep({ kind: "amount", error: "Enter an amount like 15 or 12.50." });
        return;
      }
      cents = parsed;
      if (cents < 100) {
        setStep({ kind: "amount", error: "Please enter an amount of at least €1." });
        return;
      }
      if (cents > clubConfig.maxDonationCents) {
        setStep({ kind: "amount", error: `The most you can give online is ${formatMoney(clubConfig.maxDonationCents)}.` });
        return;
      }
      setAmountCents(cents);
    }
    setIdempotencyKey(crypto.randomUUID());
    setStep({ kind: "review" });
  }

  function confirm() {
    startTransition(async () => {
      const result = await donateAction({ goalId: goal.id, amountCents, methodId, idempotencyKey });
      setStep({ kind: "result", result });
    });
  }

  const effectiveAmount = custom.trim() ? (parseEuros(custom) ?? 0) : amountCents;

  return (
    <>
      <Button variant="primary" onClick={() => setStep({ kind: "amount" })} disabled={!canDonate}>
        Make a donation
      </Button>
      {!canDonate && (
        <p className="text-xs text-muted">Donations are made by family supporters — add the role in your profile.</p>
      )}

      <Sheet open={step.kind === "amount"} onClose={close} title="Your contribution">
        <p className="text-xl font-bold text-navy">{goal.title}</p>
        <p className="text-sm text-muted">Choose a one-off amount</p>
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Preset amounts">
          {clubConfig.donationPresetsCents.map((cents) => {
            const selected = !custom.trim() && amountCents === cents;
            return (
              <Button
                key={cents}
                variant={selected ? "primary" : "secondary"}
                aria-pressed={selected}
                onClick={() => {
                  setCustom("");
                  setAmountCents(cents);
                }}
              >
                {formatMoney(cents)}
              </Button>
            );
          })}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Other amount</span>
          <span className="flex h-13 items-center rounded-2xl bg-pale px-4 focus-within:outline-2 focus-within:outline-navy">
            <span className="font-semibold text-navy">€</span>
            <input
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="e.g. 15 or 12.50"
              aria-invalid={custom.trim() !== "" && parseEuros(custom) === null}
              className="h-full w-full bg-transparent px-2 font-semibold text-navy outline-none placeholder:font-normal placeholder:text-muted"
            />
          </span>
        </label>
        <p className="flex items-center gap-2 text-sm text-muted">
          <HeartIcon className="size-5 text-navy" /> {method.label}
        </p>
        {step.kind === "amount" && step.error && <Notice tone="error">{step.error}</Notice>}
        <Button variant="primary" onClick={continueToReview} disabled={!custom.trim() && effectiveAmount <= 0}>
          {effectiveAmount > 0 ? `Continue with ${formatMoney(effectiveAmount)}` : "Continue"}
        </Button>
        <p className="text-xs text-muted">Demo payment. No money is taken.</p>
      </Sheet>

      <Sheet
        open={step.kind === "review"}
        onClose={close}
        onBack={() => setStep({ kind: "amount" })}
        title="Review donation"
      >
        <p className="text-xl font-bold text-navy">{goal.title}</p>
        <div className="flex items-baseline justify-between border-b border-ink/20 pb-4">
          <span className="text-sm text-muted">Contribution · One-off</span>
          <span className="text-4xl font-bold text-navy">{formatMoney(amountCents)}</span>
        </div>
        <p className="font-semibold text-navy">{method.label}</p>
        <Button onClick={() => setStep({ kind: "method" })}>Change payment method</Button>
        <p className="text-sm text-muted">
          This is a simulated payment. Your funding total changes only after confirmation.
        </p>
        <Button variant="primary" onClick={confirm} disabled={pending}>
          {pending ? "Processing…" : "Confirm demo donation"}
        </Button>
      </Sheet>

      <Sheet open={step.kind === "method"} onClose={close} onBack={() => setStep({ kind: "review" })} title="Payment method">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Payment method">
          {methods.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-paper p-4">
              <input
                type="radio"
                name="method"
                checked={methodId === m.id}
                onChange={() => setMethodId(m.id)}
                className="size-4 accent-navy"
              />
              <span>
                <span className="block font-semibold">{m.label}</span>
                <span className="text-sm text-muted">{m.note}</span>
              </span>
            </label>
          ))}
        </div>
        <Button variant="primary" onClick={() => setStep({ kind: "review" })}>
          Use this method
        </Button>
      </Sheet>

      <Sheet
        open={step.kind === "result"}
        onClose={close}
        title={
          step.kind === "result"
            ? { succeeded: "Thank you!", declined: "Payment declined", pending: "Payment pending", invalid: "Let's fix that" }[
                step.result.kind
              ]
            : ""
        }
      >
        {step.kind === "result" && (
          <ResultBody
            result={step.result}
            goalTitle={goal.title}
            onRetry={() => {
              // A retry after a decline is a new payment attempt.
              setIdempotencyKey(crypto.randomUUID());
              setStep({ kind: "review" });
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function ResultBody({
  result,
  goalTitle,
  onRetry,
}: {
  result: DonationActionResult;
  goalTitle: string;
  onRetry: () => void;
}) {
  switch (result.kind) {
    case "succeeded":
      return (
        <>
          <p className="text-4xl font-bold text-navy">{formatMoney(result.amountCents)}</p>
          <p>
            Your gift to <strong>{goalTitle}</strong> has been confirmed and added to the club total.
          </p>
          <p className="text-sm text-muted">Receipt {result.receiptNumber}</p>
          {result.goalFunded ? (
            <Link href="/donate/achieved" className={buttonClass("gold")}>
              You completed the goal! See what&apos;s next
            </Link>
          ) : null}
        </>
      );
    case "declined":
      return (
        <>
          <p>Your card was declined, so no donation was recorded. You can try another payment method.</p>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </>
      );
    case "pending":
      return (
        <p>
          We&apos;re waiting for your payment provider to confirm. We won&apos;t charge you again — your donation will
          appear once confirmed.
        </p>
      );
    case "invalid":
      return <p>{result.message}</p>;
  }
}
