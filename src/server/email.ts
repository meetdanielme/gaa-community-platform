import { clubConfig } from "@/club.config";

/**
 * Sends a plain-text email via Resend when RESEND_API_KEY and EMAIL_FROM are
 * set. Otherwise the email is printed to the server log, which is enough for
 * local development and demos. Returns whether it was actually delivered.
 */
export async function sendEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info(`[email] (not sent — email not configured) to=${input.to} subject="${input.subject}"\n${input.text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `${clubConfig.fullName} <${from}>`, to: input.to, subject: input.subject, text: input.text }),
  });
  if (!res.ok) {
    console.error(`[email] Resend error ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
