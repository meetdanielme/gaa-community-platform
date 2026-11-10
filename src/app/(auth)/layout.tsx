import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/app-shell";
import { getSession } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/feed");
  return (
    <div className="flex min-h-dvh flex-col items-center bg-paper px-4 py-10">
      <Link href="/" aria-label="Home" className="mb-10">
        <Logo width={220} priority />
      </Link>
      <main className="w-full max-w-md rounded-card bg-surface p-6 sm:p-8">{children}</main>
    </div>
  );
}
