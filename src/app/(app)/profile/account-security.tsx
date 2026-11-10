"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Input } from "@/components/form";
import { Sheet } from "@/components/sheet";
import { Button, Card, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function AccountSecurity() {
  const router = useRouter();
  const [sheet, setSheet] = useState<"password" | "delete" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const open = (s: typeof sheet) => {
    setMessage(null);
    setSheet(s);
  };

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const newPassword = String(form.get("newPassword"));
    if (newPassword !== String(form.get("confirmPassword"))) {
      setMessage({ tone: "error", text: "The new passwords don't match." });
      return;
    }
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("currentPassword")),
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      setMessage({ tone: "error", text: error.message ?? "We couldn't change your password." });
      return;
    }
    formEl.reset();
    setMessage({ tone: "success", text: "Password changed. You've been signed out on other devices." });
  }

  async function deleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    const { error } = await authClient.deleteUser({ password: String(form.get("password")) });
    setPending(false);
    if (error) {
      setMessage({ tone: "error", text: error.message ?? "We couldn't delete your account." });
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">Account &amp; privacy</h2>
      <Button onClick={() => open("password")}>Change password</Button>
      <Button variant="ghost" className="text-red-700" onClick={() => open("delete")}>
        Delete my account
      </Button>

      <Sheet open={sheet === "password"} onClose={() => setSheet(null)} title="Change password">
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <Field label="Current password">
            <Input name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Confirm new password">
            <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          {sheet === "password" && message && <Notice tone={message.tone}>{message.text}</Notice>}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Sheet>

      <Sheet open={sheet === "delete"} onClose={() => setSheet(null)} title="Delete your account?">
        <form onSubmit={deleteAccount} className="flex flex-col gap-4">
          <p>
            This permanently deletes your account, your linked family profiles, their event responses and your votes.
            Donation records are kept anonymously for the club&apos;s accounts.
          </p>
          <Field label="Enter your password to confirm">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          {sheet === "delete" && message && <Notice tone={message.tone}>{message.text}</Notice>}
          <Button type="submit" variant="primary" disabled={pending} className="bg-red-700 hover:bg-red-800">
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </form>
      </Sheet>
    </Card>
  );
}
