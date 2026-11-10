import type { PaymentResult } from "@/lib/rules/payments";

/**
 * Payment provider seam. The demo provider never moves money; swap in a real
 * provider (e.g. Stripe) by implementing this interface.
 */
export interface PaymentProvider {
  charge(input: {
    amountCents: number;
    methodId: string;
    description: string;
    idempotencyKey: string;
  }): Promise<{ result: PaymentResult; reference: string }>;
}

/** Demo cards, following common test-card conventions. */
export const demoPaymentMethods = [
  { id: "demo_4242", label: "Demo card ···· 4242", note: "Always succeeds" },
  { id: "demo_0002", label: "Demo card ···· 0002", note: "Always declined" },
] as const;

export const demoPaymentProvider: PaymentProvider = {
  async charge({ methodId, idempotencyKey }) {
    const reference = `demo_${idempotencyKey.slice(0, 12)}`;
    if (methodId === "demo_0002") return { result: "declined", reference };
    if (methodId === "demo_4242") return { result: "succeeded", reference };
    return { result: "declined", reference };
  },
};

export const payments: PaymentProvider = demoPaymentProvider;

export function receiptNumber(prefix: string) {
  const n = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${n}`;
}
