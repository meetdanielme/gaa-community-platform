"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Input } from "@/components/form";
import { limits } from "@/lib/limits";
import { Button, Notice } from "@/components/ui";
import { ROLES, roleLabels, serializeRoles, type Role } from "@/lib/rules/roles";

const roleHints: Record<Role, string> = {
  player: "You play for one of the club's teams.",
  family_supporter: "You support family members and can pay fees and donate.",
};

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const roles = form.getAll("roles").map(String) as Role[];
    if (roles.length === 0) {
      setError("Choose at least one way you're involved with the club.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
      roles: serializeRoles(roles),
    });
    if (error) {
      setError(error.message ?? "We couldn't create your account. Please try again.");
      setPending(false);
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Join the club</h1>
        <p className="mt-1 text-muted">One account for you and your family.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Full name" limit={limits.contact.name}>
          <Input name="name" autoComplete="name" limit={limits.contact.name} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">How are you involved?</legend>
          {ROLES.map((role) => (
            <label key={role} className="flex cursor-pointer items-start gap-3 rounded-xl bg-paper p-3">
              <input
                type="checkbox"
                name="roles"
                value={role}
                defaultChecked={role === "family_supporter"}
                className="mt-1 size-4 accent-navy"
              />
              <span>
                <span className="block font-semibold">{roleLabels[role]}</span>
                <span className="text-sm text-muted">{roleHints[role]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        Already a member?{" "}
        <Link href="/sign-in" className="font-semibold text-navy hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
