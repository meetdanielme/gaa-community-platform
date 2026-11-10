"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui";

/** Must match the demo account in scripts/seed-data.mts. */
export const DEMO_EMAIL = "evan@example.com";
export const DEMO_PASSWORD = "saints-demo-2026";

export function DemoSignInButton({ className = "sm:w-56" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (error) {
      setError("The demo account isn't available right now.");
      setPending(false);
      return;
    }
    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" onClick={signIn} disabled={pending} className={className}>
        {pending ? "Signing in…" : "Explore the demo"}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
