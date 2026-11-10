import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = { title: { default: "Club admin", template: "%s · Club admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
