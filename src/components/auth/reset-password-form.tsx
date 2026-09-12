"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { resetPassword } from "@/lib/auth-client";

const MIN_PASSWORD = 10;

/**
 * Choose a new password.
 *
 * The token arrives in the URL from the emailed link. It is never validated
 * here — only the server can say whether it is real and unexpired, and a
 * client-side check would just be a second opinion with no authority.
 *
 * Completing this revokes every other session (`revokeSessionsOnPasswordReset`
 * in the server config): the usual reason to reset a password is that someone
 * else may be holding the old one.
 */
export function ResetPasswordForm() {
  const token = useSearchParams().get("token");

  if (!token) {
    return (
      <div className="rounded-[var(--radius-md)] border border-line bg-subtle px-4 py-3.5">
        <p className="text-[14px] font-medium">This link is incomplete</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Open the link from your email exactly as it was sent, or{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-brand underline underline-offset-2"
          >
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return <TokenForm token={token} />;
}

/**
 * Split out so `token` is a plain `string` here rather than `string | null`.
 * A hoisted function declaration does not inherit a narrowing from an earlier
 * guard, so the alternative is asserting a value the type system already knows.
 */
function TokenForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    setError(null);

    const { error: failed } = await resetPassword({ newPassword: password, token });

    if (failed) {
      setError(
        failed.status === 429
          ? "Too many attempts. Wait a few minutes and try again."
          : "This link has expired or has already been used. Request a new one.",
      );
      setBusy(false);
      return;
    }

    // Every session was just revoked, so nothing the router is holding is
    // still valid — reload rather than patch it up.
    window.location.assign("/signin");
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

      <Field
        label="New password"
        id="rp-password"
        hint={`At least ${MIN_PASSWORD} characters.`}
        required
      >
        <input
          id="rp-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="rp-password-hint"
          className={inputClass(Boolean(error))}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
