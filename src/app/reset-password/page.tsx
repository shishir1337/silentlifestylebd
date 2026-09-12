import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FormFallback } from "@/components/auth/form-fallback";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your Silent Lifestyle BD account.",
  robots: { index: false, follow: false },
};

/**
 * The reset token arrives as `?token=`, read on the client — so the form sits
 * behind Suspense and the page stays static. The token never reaches the
 * server as part of a rendered URL this way, only in the request the form
 * makes.
 */
export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      lead="Choose something you have not used on another site."
    >
      <Suspense fallback={<FormFallback fields={1} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
