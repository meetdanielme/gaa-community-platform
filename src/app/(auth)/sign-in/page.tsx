import { Suspense } from "react";
import type { Metadata } from "next";
import { clubConfig } from "@/club.config";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm demoMode={clubConfig.demoMode} />
    </Suspense>
  );
}
