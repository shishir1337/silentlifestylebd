import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { FormFallback } from "@/components/auth/form-fallback";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Silent Lifestyle BD account.",
  // A crawler would only ever see the empty form, and a sign-in page competing
  // with the catalogue in search results helps nobody.
  robots: { index: false, follow: false },
};

/**
 * Sign in.
 *
 * The form reads `?next=` with `useSearchParams`, which opts the route into
 * client-side search params — the `<Suspense>` boundary is what keeps the page
 * itself prerendered as static HTML instead of rendering per request.
 */
export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      lead="See your orders and keep your delivery addresses to hand."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-brand underline underline-offset-2"
          >
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormFallback fields={2} />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
