"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Input } from "@/components/form";
import { Button, Notice } from "@/components/ui";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "This reset link is invalid or has expired." : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) {
      setError("The passwords don't match.");
      return;
    }
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword, token: token ?? "" });
    setPending(false);
    if (error) {
      setError(error.message ?? "This reset link is invalid or has expired.");
      return;
    }
    router.push("/sign-in?reset=1");
  }

  if (!token) {
    return (
      <Notice tone="error">
        This reset link is invalid or has expired.{" "}
        <Link href="/forgot-password" className="font-semibold underline">
          Request a new one
        </Link>
        .
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="New password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
