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
 * NOTE FOR THE OWNER: this describes what the site as built actually does. It
 * is a factual claim to your customers, not boilerplate, so it has to be
 * revised whenever the stack changes — this page was already rewritten once,
 * when optional accounts shipped and "there is no account to create and no
 * password to store" stopped being true.
 *
 * Things that would make it untrue again: Meta Pixel, Google Analytics, any
 * payment gateway, an SMS or email marketing provider. Have a lawyer review it.
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
          You can order without an account; creating one is optional and changes
          nothing about how your order is handled.
        </p>
        <Bullets
          items={[
            "At checkout: your name, mobile number, optional alternative number, delivery address and any order note you write.",
            "If you create an account: your name, email address and a password. The password is stored only as a scrambled fingerprint — we cannot read it, and neither can anyone who obtains our database.",
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
          Your shopping bag is stored in this browser&apos;s local storage — on
          your own device, not on our servers. Clearing your browser data
          empties it.
        </p>
        <Bullets
          items={[
            "We do not use advertising or tracking cookies.",
            "We do not run third-party analytics on this site.",
            "Nothing in local storage is sent to us automatically.",
          ]}
        />
      </Section>

      <Section id="cookies" title="Cookies">
        <p>
          We set one cookie, and only if you sign in. It holds a random session
          identifier — nothing about you, and nothing readable — and it is what
          keeps you signed in as you move between pages. Signing out removes it,
          and it expires on its own after thirty days.
        </p>
        <Bullets
          items={[
            "It is not used to track you, here or anywhere else.",
            "It is marked HttpOnly, so no script on the page can read it, and Secure, so it is never sent over an unencrypted connection.",
            "Browsing and ordering as a guest sets no cookie at all.",
          ]}
        />
      </Section>

      <Section id="accounts" title="If you create an account">
        <p>
          An account saves your delivery addresses and lets you see the orders
          you placed while signed in, from any device. It is a convenience —
          nothing more is collected because you have one.
        </p>
        <Bullets
          items={[
            "We record when you sign in, with the network address it came from, so we can spot someone trying to break into accounts.",
            "Ask us to close your account and we will delete it, along with your saved addresses.",
            "Order records survive that deletion where we are required to keep them for accounting.",
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
            "Close your account at any time — ask us and we will delete it and your saved addresses.",
            "Clear your browser data to empty your shopping bag.",
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
