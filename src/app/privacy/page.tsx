import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.legalName} collects, uses and stores your information.`,
  alternates: { canonical: "/privacy" },
};

/** Kept as a constant so a static build cannot freeze a `new Date()` at whatever
 *  day it happened to run, and then quietly claim that as the revision date. */
const UPDATED = "13 September 2026";

/**
 * NOTE FOR THE OWNER: this describes what the site as built actually does —
 * no analytics, no third-party tracking, no accounts, data kept in the
 * browser. Every one of those becomes untrue the moment you add Meta Pixel,
 * Google Analytics, a payment gateway or a real backend. Have a lawyer review
 * it, and revisit it whenever the stack changes.
 */
export default function PrivacyPage() {
  return (
    <Container>
      <PageHeader
        breadcrumb="Privacy policy"
        title="Privacy policy"
        lead={`How we handle your information. Last updated ${UPDATED}.`}
      />

      <Section id="collect" title="What we collect">
        <p>
          We ask for the minimum needed to get a parcel to you and nothing else.
          There is no account to create and no password to store.
        </p>
        <Bullets
          items={[
            "At checkout: your name, mobile number, optional alternative number, delivery address and any order note you write.",
            "If you contact us: whatever you tell us in the call, WhatsApp message or email.",
            "We do not ask for your date of birth, national ID, or any payment card details.",
          ]}
        />
      </Section>

      <Section id="use" title="What we use it for">
        <Bullets
          items={[
            "Confirming your order by phone before dispatch.",
            "Handing your name, number and address to the courier so they can deliver.",
            "Arranging returns, exchanges and refunds.",
            "Answering your questions when you contact us.",
          ]}
        />
        <p>
          We do not sell your information, and we do not pass it to anyone except
          the courier delivering your order.
        </p>
      </Section>

      <Section id="browser" title="What stays in your browser">
        <p>
          Your bag and your order history are stored in this browser&apos;s local
          storage — on your own device, not on our servers. Clearing your browser
          data removes them, which is also why order tracking only finds orders
          placed on the same device.
        </p>
        <Bullets
          items={[
            "We do not use advertising or tracking cookies.",
            "We do not run third-party analytics on this site.",
            "Nothing in local storage is sent to us automatically.",
          ]}
        />
      </Section>

      <Section id="retention" title="How long we keep it">
        <p>
          Order records are kept as long as we need them for accounting and for
          handling returns. Ask us to delete your details and we will, unless we are
          required to keep a record of the transaction.
        </p>
      </Section>

      <Section id="rights" title="Your choices">
        <Bullets
          items={[
            "Ask what we hold about you — call or email and we will tell you.",
            "Ask us to correct a wrong number or address.",
            "Ask us to delete your details after an order is settled.",
            "Clear your browser data to remove your bag and local order history.",
          ]}
        />
      </Section>

      <Section id="contact-privacy" title="Questions">
        <p>
          Email{" "}
          <a
            href={`mailto:${site.email}`}
            className="font-medium text-brand underline underline-offset-2"
          >
            {site.email}
          </a>{" "}
          or call{" "}
          <a
            href={`tel:${site.phone}`}
            className="tabular font-medium text-brand underline underline-offset-2"
          >
            {site.phoneDisplay}
          </a>
          . Our address is {site.address}.
        </p>
      </Section>
    </Container>
  );
}
