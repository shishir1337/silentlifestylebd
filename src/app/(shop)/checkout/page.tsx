import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { AccountProvider } from "@/lib/account";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your order with cash on delivery anywhere in Bangladesh.",
  // A funnel page with nothing to rank for, and personal details on screen.
  robots: { index: false, follow: false },
};

/**
 * Checkout.
 *
 * Still a static page, deliberately. `AccountProvider` fetches the customer's
 * saved details after mount rather than the page reading the session on the
 * server — doing that would make checkout render per request for a shopper who,
 * most of the time, is a guest with nothing to prefill.
 */
export default function CheckoutPage() {
  return (
    <Container>
      <header className="py-6">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">
          Checkout
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Cash on delivery — no advance payment needed.
        </p>
      </header>

      {/*
        A screen's worth of height, whatever is inside it.

        The bag is in `localStorage` and is read after mount, so the first
        paint cannot know whether this is a full order or an empty basket —
        and the three things that can render here are 192px, 371px and about
        1500px tall. Whichever one arrives, the footer used to move: measured
        on a 4x-throttled phone, 0.0839 of layout shift on the one page where
        somebody is deciding whether to go through with it.

        Reserving the height here rather than in any one branch is what fixes
        it, because the branches cannot agree on a height and do not need to.
        The footer starts below the fold and stays there; a taller form pushes
        it further off-screen, and a shift nobody can see is not a shift —
        which is what Core Web Vitals actually measures, not a way around it.

        `svh` rather than `vh`: on a phone, `vh` is the height with the browser
        chrome hidden, so a `100vh` box is taller than the screen until the
        address bar collapses.
      */}
      <div className="min-h-[80svh]">
        <AccountProvider>
          <CheckoutForm />
        </AccountProvider>
      </div>
    </Container>
  );
}
