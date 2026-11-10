"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { Button, Notice } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { payFeeAction, type FeeResult } from "../../actions";

type Method = { id: string; label: string; note: string };

/* UC5 — Pay membership fees (Figma "Sheet / membership"). */
export function PayFeeButton({
  feeId,
  memberName,
  amountCents,
  status,
  canPay,
  methods,
}: {
  feeId: string;
  memberName: string;
  amountCents: number;
  status: string;
  canPay: boolean;
  methods: Method[];
}) {
  const [open, setOpen] = useState(false);
  const [methodId, setMethodId] = useState(methods[0].id);
  const [result, setResult] = useState<FeeResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "pending") {
    return <Notice>A payment for this fee is being confirmed. You won&apos;t be charged twice.</Notice>;
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} disabled={!canPay}>
        Pay {formatMoney(amountCents)} membership
      </Button>
      {!canPay && <p className="text-xs text-muted">Membership fees are paid by family supporters.</p>}
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setResult(null);
        }}
        title="Membership fee"
      >
        {result?.ok && result.status === "succeeded" ? (
          <>
            <p className="text-xl font-bold text-navy">Paid — thank you!</p>
            <p>
              {memberName}&apos;s membership is confirmed. Receipt {result.receipt}.
            </p>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-navy">{memberName}</p>
            <p className="text-4xl font-bold text-navy">{formatMoney(amountCents)}</p>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Payment method">
              {methods.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-paper p-3">
                  <input
                    type="radio"
                    name="fee-method"
                    checked={methodId === m.id}
                    onChange={() => setMethodId(m.id)}
                    className="size-4 accent-navy"
                  />
                  <span>
                    <span className="block font-semibold">{m.label}</span>
                    <span className="text-xs text-muted">{m.note}</span>
                  </span>
                </label>
              ))}
            </div>
            {result && !result.ok && <Notice tone="error">{result.error}</Notice>}
            {result?.ok && result.status === "declined" && (
              <Notice tone="error">Your card was declined. The fee is still unpaid — try another method.</Notice>
            )}
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => startTransition(async () => setResult(await payFeeAction(feeId, methodId)))}
            >
              {pending ? "Processing…" : "Confirm demo payment"}
            </Button>
            <p className="text-xs text-muted">Demo payment. No money is taken.</p>
          </>
        )}
      </Sheet>
    </>
  );
}
