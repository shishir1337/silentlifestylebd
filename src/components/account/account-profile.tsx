"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { emptyProfile, useProfile, type Profile } from "@/lib/account";
import { BD_MOBILE, normalisePhone } from "@/lib/phone";
import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";


/**
 * Profile details.
 *
 * The form mirrors saved state into local inputs once the first load resolves,
 * then stops syncing — a late read must never overwrite something half-typed.
 *
 * Email is shown but not editable for a signed-in customer: it is their
 * sign-in identifier, so changing it has to prove the new address is
 * reachable. That is an authentication flow, not a field on a details form,
 * and it needs the email provider this store has not chosen yet.
 */
export function AccountProfile() {
  const { profile, ready, signedIn, save } = useProfile();
  const [form, setForm] = useState<Profile>(emptyProfile);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready) setForm(profile);
  }, [ready, profile]);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(id);
  }, [saved]);

  if (!ready) return <div className="py-20" aria-busy="true" />;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Partial<Record<keyof Profile, string>> = {};

    if (form.phone.trim() && !BD_MOBILE.test(normalisePhone(form.phone))) {
      next.phone = "Enter an 11-digit number starting with 01, e.g. 01712345678.";
    }
    if (form.altPhone.trim() && !BD_MOBILE.test(normalisePhone(form.altPhone))) {
      next.altPhone = "Enter an 11-digit number starting with 01.";
    }
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email.trim())) {
      next.email = "Enter a valid email address, or leave it blank.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setFailure(null);
    try {
      await save({
        name: form.name.trim(),
        phone: normalisePhone(form.phone),
        altPhone: normalisePhone(form.altPhone),
        email: form.email.trim(),
      });
      setSaved(true);
    } catch {
      setFailure("Could not save your details. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  return (
    <div className="pb-4">
      <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
        Profile
      </h1>
      <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
        {signedIn
          ? "Saved to your account and used to fill in checkout."
          : "Optional details, saved on this device to speed up checkout."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 max-w-lg space-y-4">
        {failure ? (
          <p
            role="alert"
            className="rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
          >
            {failure}
          </p>
        ) : null}

        <Field label="Full name" id="p-name">
          <input
            id="p-name"
            autoComplete="name"
            value={form.name}
            onChange={set("name")}
            className={inputClass()}
          />
        </Field>

        <Field label="Mobile number" id="p-phone" error={errors.phone}>
          <input
            id="p-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01712345678"
            value={form.phone}
            onChange={set("phone")}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "p-phone-error" : undefined}
            className={inputClass(Boolean(errors.phone))}
          />
        </Field>

        <Field
          label="Alternative number"
          id="p-alt"
          error={errors.altPhone}
          hint="Used only if your first number is unreachable."
        >
          <input
            id="p-alt"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={form.altPhone}
            onChange={set("altPhone")}
            aria-invalid={errors.altPhone ? true : undefined}
            aria-describedby={errors.altPhone ? "p-alt-error" : undefined}
            className={inputClass(Boolean(errors.altPhone))}
          />
        </Field>

        <Field
          label="Email"
          id="p-email"
          error={errors.email}
          hint={
            signedIn
              ? "This is how you sign in. Contact us if you need to change it."
              : "Optional. We contact you by phone, not email."
          }
        >
          <input
            id="p-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            readOnly={signedIn}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "p-email-error" : "p-email-hint"}
            className={cn(
              inputClass(Boolean(errors.email)),
              signedIn && "cursor-not-allowed bg-subtle text-ink-muted",
            )}
          />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 text-[14px] font-medium transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] active:scale-[0.98]",
              saved
                ? "border border-brand bg-brand-tint text-brand"
                : "bg-ink text-white hover:bg-ink/90",
            )}
          >
            {saved ? <CheckIcon className="size-4" /> : null}
            {busy ? "Saving…" : saved ? "Saved" : "Save details"}
          </button>
          <p aria-live="polite" className="sr-only">
            {saved ? "Your details were saved." : ""}
          </p>
        </div>
      </form>

      <div className="mt-8 rounded-[var(--radius-md)] border border-line bg-subtle p-4">
        <h2 className="text-[14px] font-semibold">Where this is stored</h2>
        <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-muted">
          {signedIn
            ? "These details are saved to your account, so they are there on any device you sign in from."
            : "These details stay in this browser and are never sent to us until you place an order. Clearing your browser data removes them."}{" "}
          See our{" "}
          <Link href="/privacy" className="font-medium text-brand underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
