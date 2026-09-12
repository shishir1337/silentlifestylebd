"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { requestPasswordReset } from "@/lib/auth-client";

/**
 * Request a password reset link.
 *
 * The confirmation is identical whether or not the address is registered.
 * Saying "no account with that email" would turn this form into a free lookup
 * for which of a leaked address list shops here.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error: failed } = await requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });

    // Only rate limiting is worth reporting. Every other outcome — unknown
    // address included — gets the same confirmation.
    if (failed?.status === 429) {
      setError("Too many requests. Wait a few minutes and try again.");
      setBusy(false);
      return;
    }

    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="rounded-[var(--radius-md)] border border-brand/30 bg-brand-tint px-4 py-3.5">
        <p className="text-[14px] font-medium">Check your email</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          If an account exists for {email.trim()}, a reset link is on its way. It
          expires in one hour. Remember to look in your spam folder.
        </p>
      </div>
    );
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

      <Field label="Email" id="fp-email" required>
        <input
          id="fp-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass()}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
