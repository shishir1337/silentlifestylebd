import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";

/**
 * The frame every auth screen sits in.
 *
 * Narrow and centred, with nothing else competing for attention — but not a
 * separate page template: the site header and footer stay, because an account
 * here is optional and a shopper who lands on this form by accident must be
 * able to carry on shopping without using the back button.
 */
export function AuthShell({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container>
      <div className="mx-auto w-full max-w-[26rem] py-8 sm:py-14">
        <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[28px]">
          {title}
        </h1>
        {lead ? <p className="mt-2 text-[14px] text-ink-soft">{lead}</p> : null}

        <div className="mt-6">{children}</div>

        {footer ? (
          <div className="mt-6 border-t border-line pt-5 text-[13px] text-ink-muted">
            {footer}
          </div>
        ) : null}

        {/*
          The reassurance that matters most on this page. Anything that reads
          like a wall in front of the catalogue costs orders, and in a
          cash-on-delivery shop an account earns the store nothing at checkout.
        */}
        <p className="mt-6 rounded-[var(--radius-md)] border border-line bg-subtle px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
          You do not need an account to order. Cash on delivery checkout works
          without one —{" "}
          <Link
            href="/collections"
            className="font-medium text-brand underline underline-offset-2"
          >
            keep shopping
          </Link>
          .
        </p>
      </div>
    </Container>
  );
}
