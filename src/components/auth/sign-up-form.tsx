"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { signUp } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";

/**
 * Must match `minPasswordLength` in the server config. If the two disagree the
 * form accepts a password the server then rejects, with a worse message.
 */
const MIN_PASSWORD = 10;

/**
 * Create an account.
 *
 * Customers only. Staff accounts are never self-served — an owner grants
 * `staffRole` from the admin panel, so there is no path from this form to any
 * elevated access regardless of what is typed into it.
 */
export function SignUpForm() {
  const params = useSearchParams();
  const destination = safeNext(params.get("next"));

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const found: Partial<Record<keyof typeof form, string>> = {};
    if (form.name.trim().length < 3) found.name = "Enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email.trim())) {
      found.email = "Enter a valid email address.";
    }
    if (form.password.length < MIN_PASSWORD) {
      found.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    setFailure(null);

    const { error } = await signUp.email({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    });

    if (error) {
      setFailure(
        error.status === 429
          ? "Too many sign-ups from this connection. Try again in a few minutes."
          : error.message || "Could not create the account. Try again.",
      );
      setBusy(false);
      return;
    }

    // A document navigation, for the reason spelled out in `sign-in-form.tsx`:
    // a client-side one races the browser committing the session cookie.
    window.location.assign(destination);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {failure ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
        >
          {failure}
        </p>
      ) : null}

      <Field label="Full name" id="su-name" error={errors.name} required>
        <input
          id="su-name"
          autoComplete="name"
          required
          value={form.name}
          onChange={set("name")}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "su-name-error" : undefined}
          className={inputClass(Boolean(errors.name))}
        />
      </Field>

      <Field label="Email" id="su-email" error={errors.email} required>
        <input
          id="su-email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set("email")}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "su-email-error" : undefined}
          className={inputClass(Boolean(errors.email))}
        />
      </Field>

      <Field
        label="Password"
        id="su-password"
        error={errors.password}
        hint={`At least ${MIN_PASSWORD} characters.`}
        required
      >
        <input
          id="su-password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set("password")}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "su-password-error" : "su-password-hint"}
          className={inputClass(Boolean(errors.password))}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
