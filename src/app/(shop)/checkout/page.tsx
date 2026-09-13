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

      <AccountProvider>
        <CheckoutForm />
      </AccountProvider>
    </Container>
  );
}
