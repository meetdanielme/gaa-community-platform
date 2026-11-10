import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/app-shell";
import { getSession } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/feed");
  return (
    <div className="flex min-h-dvh flex-col items-center bg-paper px-4 py-10">
      <Link href="/" aria-label="Home" className="mb-10">
        <Wordmark />
      </Link>
      <main className="w-full max-w-md rounded-card bg-white p-6 sm:p-8">{children}</main>
    </div>
  );
}
