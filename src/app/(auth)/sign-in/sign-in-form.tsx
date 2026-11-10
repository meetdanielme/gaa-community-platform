"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { DemoSignInButton } from "@/components/demo-sign-in";
import { Field, Input } from "@/components/form";
import { Button, Notice } from "@/components/ui";
import { safeNext } from "@/lib/format";

export function SignInForm({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const justReset = params.get("reset") === "1";
  const next = safeNext(params.get("next"), "/feed");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(error.message ?? "We couldn't sign you in. Check your details and try again.");
      setPending(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-muted">Sign in to your club account.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" defaultValue={params.get("email") ?? ""} required />
        </Field>
        <Field
          label="Password"
          hint={
            <Link href="/forgot-password" className="font-semibold text-navy hover:underline">
              Forgot your password?
            </Link>
          }
        >
          <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
        </Field>
        {justReset && <Notice tone="success">Password updated — sign in with your new password.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {demoMode && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted uppercase">
            <span className="h-px flex-1 bg-pale" /> or try the demo <span className="h-px flex-1 bg-pale" />
          </div>
          <DemoSignInButton className="w-full" />
          <DemoSignInButton className="w-full" as="admin" />
        </>
      )}
      <p className="text-center text-sm text-muted">
        New to the club?{" "}
        <Link href={next === "/feed" ? "/sign-up" : `/sign-up?${new URLSearchParams({ next, email: params.get("email") ?? "" })}`} className="font-semibold text-navy hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
