"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { DEMO_ADMIN, DEMO_MEMBER, DEMO_PASSWORD } from "@/lib/demo";
import { Button } from "./ui";

/** One-click sign-in to a demo account (only rendered in demo mode). */
export function DemoSignInButton({
  className = "sm:w-56",
  as = "member",
  variant,
}: {
  className?: string;
  as?: "member" | "admin";
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = as === "admin" ? DEMO_ADMIN : DEMO_MEMBER;

  async function signIn() {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email: account.email, password: DEMO_PASSWORD });
    if (error) {
      setError("The demo account isn't available right now.");
      setPending(false);
      return;
    }
    router.push(as === "admin" ? "/admin" : "/feed");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant ?? (as === "admin" ? "secondary" : "primary")}
        onClick={signIn}
        disabled={pending}
        className={className}
      >
        {pending ? "Signing in…" : account.label}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
