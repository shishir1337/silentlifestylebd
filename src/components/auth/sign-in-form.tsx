"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { signIn } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";

/**
 * Sign in.
 *
 * Staff and customers use the same form. Nothing here knows or cares which one
 * is typing — the difference is `User.staffRole`, read server-side by the DAL
 * when they reach a protected page. A sign-in form that branched on role would
 * be telling an attacker which addresses are worth attacking.
 *
 * ## Why `window.location` and not the router
 *
 * Measured, not assumed: after `signIn.email()` resolves, the very next
 * client-side navigation goes out with **no Cookie header at all** — the
 * browser has not finished committing the `Set-Cookie` from the auth response
 * when the router issues its RSC fetch. Proxy sees an anonymous request and
 * bounces the customer straight back to the form they just completed. Requests
 * a moment later carry the cookie fine, which is what makes it look
 * intermittent rather than broken.
 *
 * A document navigation cannot race it: the browser resolves the cookie jar as
 * part of making the request. It also discards the router cache built while
 * signed out, which is the right thing to do the moment identity changes.
 */
export function SignInForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error: failed } = await signIn.email({ email: email.trim(), password });

    if (failed) {
      /**
       * One message for every failure, deliberately.
       *
       * "No account with that email" tells a stranger which addresses are
       * registered here, which is the first half of a credential-stuffing run.
       * The rate limiter is the second line of defence; this is the first.
       */
      setError(
        failed.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : "That email and password do not match. Check both and try again.",
      );
      setBusy(false);
      return;
    }

    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
        >
          {error}
        </p>
      ) : null}

      <Field label="Email" id="si-email" required>
        <input
          id="si-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass()}
        />
      </Field>

      <Field label="Password" id="si-password" required>
        <input
          id="si-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass()}
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-[13px] font-medium text-brand underline underline-offset-2"
        >
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
