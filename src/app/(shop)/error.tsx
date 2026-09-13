"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { Button, ButtonLink } from "@/components/ui/button";
import { useSettings } from "@/lib/site-settings";

/**
 * When a shop page throws.
 *
 * The customer does not care what broke. They care whether their order went
 * through and whether this shop is real, so the copy answers both: nothing was
 * charged, nothing was placed, and here is a phone number.
 *
 * `retry()` re-fetches before re-rendering — the difference that matters,
 * since the usual cause is a momentary database blip and `reset()` would show
 * the same failure again.
 *
 * The phone number comes from the settings context. This boundary sits inside
 * the storefront layout, so the provider is above it — an error in a page
 * cannot take the number with it.
 */
export default function ShopError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const site = useSettings();

  useEffect(() => {
    console.error("Shop error", error);
  }, [error]);

  return (
    <Container>
      <div className="py-14 sm:py-20">
        <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">
          Something went wrong
        </h1>
        <p className="mt-2.5 max-w-prose text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">
          This page didn&apos;t load properly. Nothing has been ordered and
          nothing has been charged — you pay only when a parcel reaches your
          hand.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button type="button" size="lg" onClick={() => retry()} className="sm:w-auto sm:px-7">
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary" className="sm:w-auto sm:px-7">
            Go to the homepage
          </ButtonLink>
        </div>

        <p className="mt-6 text-[12.5px] text-ink-muted">
          Need something ordered today? Call{" "}
          <a
            href={`tel:${site.phone}`}
            className="tabular font-medium text-brand underline underline-offset-2"
          >
            {site.phoneDisplay}
          </a>{" "}
          and we will place it for you.
        </p>
      </div>
    </Container>
  );
}
