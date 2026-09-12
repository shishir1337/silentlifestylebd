import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icons";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Store location",
  description: `Visit ${site.legalName} at ${site.address}. Open 10am–9pm.`,
  alternates: { canonical: "/stores" },
};

const hours = [
  ["Saturday – Thursday", "10:00am – 9:00pm"],
  ["Friday", "3:00pm – 9:00pm"],
];

/**
 * Store location.
 *
 * One outlet, so this is a detail page rather than a finder. If more open, the
 * card below is the unit to repeat — and the `LocalBusiness` JSON-LD becomes a
 * list rather than a single entity.
 */
export default function StoresPage() {
  return (
    <Container>
      <PageHeader
        breadcrumb="Store location"
        title="Visit the store"
        lead="Come and try things on. Anything you see online is in the shop, and anything in the shop can be delivered."
      />

      <div className="rounded-[var(--radius-md)] border border-line p-5">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
            <PinIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold">Dhaka — Panthapath</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
              {site.address}
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[14px]">
          {hours.map(([day, time]) => (
            <div key={day} className="flex justify-between gap-4">
              <dt className="text-ink-soft">{day}</dt>
              <dd className="tabular font-medium">{time}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4 sm:flex-row">
          <ButtonLink
            href="https://maps.google.com"
            target="_blank"
            rel="noreferrer noopener"
            className="sm:flex-1"
          >
            Get directions
          </ButtonLink>
          <ButtonLink href={`tel:${site.phone}`} variant="secondary" className="sm:flex-1">
            <PhoneIcon className="size-4" />
            <span className="tabular">{site.phoneDisplay}</span>
          </ButtonLink>
        </div>
      </div>

      <Section id="visiting" title="Before you come">
        <Bullets
          items={[
            "Call ahead if you want a specific size or colour held — we will keep it at the counter for the day.",
            "Anything bought in store follows the same 7-day exchange policy.",
            "You can also collect an online order here instead of paying delivery.",
            "Parking is on the main road; the shop is on the retail floor.",
          ]}
        />
      </Section>

      <Section id="contact-other" title="Other ways to reach us">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={`tel:${site.phone}`}
            className="inline-flex min-h-6 items-center gap-2 font-medium text-brand underline underline-offset-2"
          >
            <PhoneIcon className="size-4" />
            <span className="tabular">{site.phoneDisplay}</span>
          </a>
          <a
            href={`mailto:${site.email}`}
            className="inline-flex min-h-6 items-center gap-2 font-medium text-brand underline underline-offset-2"
          >
            <MailIcon className="size-4" />
            {site.email}
          </a>
        </p>
      </Section>

      <StoreJsonLd />
    </Container>
  );
}

function StoreJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: site.legalName,
    url: `${site.url}/stores`,
    telephone: site.phone,
    email: site.email,
    currenciesAccepted: "BDT",
    paymentAccepted: "Cash on Delivery, bKash, Nagad, Card",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address,
      addressLocality: "Dhaka",
      postalCode: "1215",
      addressCountry: "BD",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "10:00",
        closes: "21:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Friday",
        opens: "15:00",
        closes: "21:00",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static, author-controlled object — no user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
