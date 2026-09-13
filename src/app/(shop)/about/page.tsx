import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { delivery, site } from "@/data/site";
import storefront from "@/assets/hero/hero-3-formals.jpg";

export const metadata: Metadata = {
  title: "About us",
  description: `${site.legalName} — everyday menswear, accessories and Pakistani ladies collections, delivered across Bangladesh with cash on delivery.`,
  alternates: { canonical: "/about" },
};

/**
 * About.
 *
 * NOTE FOR THE OWNER: this is placeholder brand copy. It is written to be true
 * of the storefront as built — nothing here invents an award, a founding date,
 * a factory or a customer count — but it is not your story. Replace it before
 * launch; the structure can stay.
 */
export default function AboutPage() {
  return (
    <Container>
      <PageHeader
        breadcrumb="About us"
        title="Everyday essentials, quietly well made"
        lead={`${site.legalName} sells menswear, accessories and Pakistani ladies collections to customers across Bangladesh.`}
      />

      <div className="relative aspect-16/9 overflow-hidden rounded-[var(--radius-lg)] bg-muted sm:aspect-21/9">
        <Image
          src={storefront}
          alt="Formal shirts and blazers on display in the store"
          fill
          priority
          sizes="100vw"
          quality={75}
          placeholder="blur"
          className="object-cover"
        />
      </div>

      <Section id="what-we-do" title="What we do">
        <p>
          We stock the clothes people in Dhaka actually wear through a normal week —
          panjabi for Friday and Eid, formal shirts and pants for the office, t-shirts
          and polos for everything else, and the belts, wallets, watches and shoes
          that go with them. Alongside that we carry Pakistani stitched and unstitched
          three-piece sets, purses and bracelets.
        </p>
        <p>
          The name is the idea: nothing loud, nothing trend-chasing. Pieces that look
          right for more than one season and hold up to being worn properly.
        </p>
      </Section>

      <Section id="how-we-sell" title="How we sell">
        <Bullets
          items={[
            <>
              <strong className="font-medium text-ink">Cash on delivery, everywhere.</strong>{" "}
              You pay when the parcel reaches your hand — never before.
            </>,
            <>
              <strong className="font-medium text-ink">Honest pricing.</strong> When we
              show a discount, the higher price is one we actually charged. No inflated
              was-prices.
            </>,
            <>
              <strong className="font-medium text-ink">One delivery charge.</strong>{" "}
              Flat inside Dhaka, flat outside, free over the threshold. No surprises at
              checkout.
            </>,
            <>
              <strong className="font-medium text-ink">
                {delivery.returnWindowDays}-day returns.
              </strong>{" "}
              Wrong size or changed your mind — send it back.
            </>,
          ]}
        />
      </Section>

      <Section id="where" title="Where to find us">
        <p>
          Our store is at {site.address}. Call{" "}
          <a
            href={`tel:${site.phone}`}
            className="tabular font-medium text-brand underline underline-offset-2"
          >
            {site.phoneDisplay}
          </a>{" "}
          between 10am and 9pm and a person will answer — the same person who can
          check a measurement or hold a size for you.
        </p>
      </Section>

      <div className="flex flex-col gap-2.5 border-t border-line py-6 sm:flex-row">
        <ButtonLink href="/collections" className="sm:flex-1">
          Shop the collections
        </ButtonLink>
        <ButtonLink href="/contact" variant="secondary" className="sm:flex-1">
          Contact us
        </ButtonLink>
        <ButtonLink href="/stores" variant="secondary" className="sm:flex-1">
          Store location
        </ButtonLink>
      </div>
    </Container>
  );
}
