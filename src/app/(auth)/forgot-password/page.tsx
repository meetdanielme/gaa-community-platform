"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Input } from "@/components/form";
import { Button, Notice } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get("email")),
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (error) setError(error.message ?? "Something went wrong. Please try again.");
    else setSent(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-1 text-muted">We&apos;ll email you a link to choose a new one.</p>
      </div>
      {sent ? (
        <Notice tone="success">
          If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder). Not
          arriving? Ask a club officer for help.
        </Notice>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-muted">
        <Link href="/sign-in" className="font-semibold text-navy hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
