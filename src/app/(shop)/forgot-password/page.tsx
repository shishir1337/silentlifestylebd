import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a link to reset your Silent Lifestyle BD password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      lead="Enter the email you signed up with and we will send a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/signin"
            className="font-medium text-brand underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
