"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { emptyProfile, useProfile, type Profile } from "@/lib/account";
import { BD_MOBILE, normalisePhone } from "@/lib/phone";
import { cn } from "@/lib/cn";


/**
 * Profile details.
 *
 * Only the fields that speed up a future checkout — there is no login, so
 * nothing here is a credential and none of it is required. The form mirrors
 * saved state into local inputs once storage is read, then stops syncing, so
 * a late read can never overwrite something half-typed.
 */
export function AccountProfile() {
  const { profile, ready, save } = useProfile();
  const [form, setForm] = useState<Profile>(emptyProfile);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready) setForm(profile);
  }, [ready, profile]);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(id);
  }, [saved]);

  if (!ready) return <div className="py-20" aria-busy="true" />;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    save({
      name: form.name.trim(),
      phone: normalisePhone(form.phone),
      altPhone: normalisePhone(form.altPhone),
      email: form.email.trim(),
    });
    setSaved(true);
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
        Optional details, saved on this device to speed up checkout. There is no
        account or password — we identify orders by number and phone.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 max-w-lg space-y-4">
        <Field label="Full name" id="p-name">
          <input
            id="p-name"
            autoComplete="name"
            value={form.name}
            onChange={set("name")}
            className={input(false)}
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
            className={input(Boolean(errors.phone))}
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
            className={input(Boolean(errors.altPhone))}
          />
        </Field>

        <Field
          label="Email"
          id="p-email"
          error={errors.email}
          hint="Optional. We contact you by phone, not email."
        >
          <input
            id="p-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "p-email-error" : undefined}
            className={input(Boolean(errors.email))}
          />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 text-[14px] font-medium transition-[background-color,border-color,color,scale] duration-[var(--dur-base)] active:scale-[0.98]",
              saved
                ? "border border-brand bg-brand-tint text-brand"
                : "bg-ink text-white hover:bg-ink/90",
            )}
          >
            {saved ? <CheckIcon className="size-4" /> : null}
            {saved ? "Saved" : "Save details"}
          </button>
          <p aria-live="polite" className="sr-only">
            {saved ? "Your details were saved." : ""}
          </p>
        </div>
      </form>

      <div className="mt-8 rounded-[var(--radius-md)] border border-line bg-subtle p-4">
        <h2 className="text-[14px] font-semibold">Where this is stored</h2>
        <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-muted">
          These details stay in this browser and are never sent to us until you place
          an order. Clearing your browser data removes them. See our{" "}
          <Link href="/privacy" className="font-medium text-brand underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function input(invalid: boolean) {
  return cn(
    "h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3 text-[16px] sm:text-[14px]",
    "placeholder:text-ink-muted focus:outline-none",
    invalid ? "border-sale focus:border-sale" : "border-line-strong focus:border-brand",
  );
}

function Field({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12px] text-sale">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
