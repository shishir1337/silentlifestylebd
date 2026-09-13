import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { FormFallback } from "@/components/auth/form-fallback";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a Silent Lifestyle BD account to save your addresses and follow your orders.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create an account"
      lead="Save your delivery addresses and follow every order from one place."
      footer={
        <>
          Already have one?{" "}
          <Link
            href="/signin"
            className="font-medium text-brand underline underline-offset-2"
          >
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormFallback fields={3} />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
