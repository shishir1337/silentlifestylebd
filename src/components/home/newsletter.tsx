"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Deliberately asks for a phone number, not an email.
 *
 * SMS is how Bangladeshi retail actually reaches customers — email open rates
 * for this segment are close to noise. Validation runs on submit rather than
 * per keystroke, and the error names the fix instead of just saying "invalid".
 */
export function Newsletter() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // BD mobile numbers: 01XXXXXXXXX, optionally +880 / 880 prefixed.
    const cleaned = phone.replace(/[\s-]/g, "");
    const valid = /^(?:\+?880|0)1[3-9]\d{8}$/.test(cleaned);

    if (!valid) {
      setError("Enter an 11-digit mobile number starting with 01, e.g. 01712345678.");
      return;
    }

    setError(null);
    setDone(true);
    // Wire to your SMS/marketing provider here.
  }

  return (
    <section aria-labelledby="offers-signup" className="py-8 sm:py-12">
      <Container>
        <div className="rounded-[var(--radius-lg)] bg-ink px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="mx-auto max-w-xl text-center">
            <h2 id="offers-signup" className="text-[22px] font-semibold sm:text-[28px]">
              Get offers by SMS
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
              New arrivals and campaign discounts, roughly twice a month. No
              spam, and you can stop any time.
            </p>

            {done ? (
              <p
                role="status"
                className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-white/10 px-4 py-3 text-[15px] font-medium"
              >
                <CheckIcon className="size-5 shrink-0 text-white" />
                You&apos;re on the list — we&apos;ll text you.
              </p>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-6">
                <div className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row">
                  <div className="flex-1 text-left">
                    <label htmlFor="phone" className="sr-only">
                      Mobile number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      enterKeyHint="send"
                      placeholder="01712345678"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (error) setError(null);
                      }}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "phone-error" : undefined}
                      /* 16px prevents the iOS focus-zoom. */
                      className="h-12 w-full rounded-[var(--radius-sm)] border border-white/20 bg-white/10 px-4 text-base text-white placeholder:text-white/40 focus:border-white/50 focus:bg-white/15 focus:outline-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 bg-white text-ink hover:bg-white/90 active:bg-white/80 sm:px-7"
                  >
                    Notify me
                  </Button>
                </div>

                {error ? (
                  <p
                    id="phone-error"
                    role="alert"
                    className="mx-auto mt-2.5 max-w-md text-left text-[13px] text-white"
                  >
                    {error}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
