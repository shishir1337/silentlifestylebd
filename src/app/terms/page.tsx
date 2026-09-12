import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { delivery, site } from "@/data/site";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: `The terms you agree to when you order from ${site.legalName}.`,
  alternates: { canonical: "/terms" },
};

const UPDATED = "13 September 2026";

/**
 * NOTE FOR THE OWNER: a plain-language starting point, written to match how the
 * storefront actually behaves. It is not legal advice and has not been reviewed
 * by a lawyer — do that before launch, particularly the liability section and
 * anything that touches Bangladeshi consumer law.
 */
export default function TermsPage() {
  return (
    <Container>
      <PageHeader
        breadcrumb="Terms & conditions"
        title="Terms & conditions"
        lead={`The terms you agree to when you order from us. Last updated ${UPDATED}.`}
      />

      <Section id="orders" title="Placing an order">
        <Bullets
          items={[
            "Placing an order is an offer to buy, not a completed sale. The sale is made when we confirm your order by phone.",
            "We may decline or cancel an order — if an item is out of stock, the address is outside our delivery area, or we cannot reach you to confirm.",
            "Give a mobile number you answer. Orders we cannot confirm are not dispatched.",
          ]}
        />
      </Section>

      <Section id="pricing" title="Prices and payment">
        <Bullets
          items={[
            "All prices are in Bangladeshi Taka and include VAT where applicable.",
            "Payment is cash on delivery unless agreed otherwise. You pay the delivery rider when the parcel reaches you.",
            <>
              Delivery is charged at the rate shown at checkout and is calculated on
              the goods subtotal, so it can never push an order past the free-delivery
              threshold.
            </>,
            "If a price is listed wrongly through an obvious error, we will contact you before dispatch rather than hold you to it.",
          ]}
        />
      </Section>

      <Section id="delivery-terms" title="Delivery">
        <Bullets
          items={[
            <>
              Stated timelines ({delivery.insideDhakaDays} inside Dhaka,{" "}
              {delivery.outsideDhakaDays} outside) run from confirmation, not from
              when you place the order.
            </>,
            "Timelines are estimates. Holidays, weather and courier delays can extend them.",
            "You may check the parcel before paying. If it is not what you ordered, refuse it and you pay nothing.",
            "Repeatedly refusing confirmed orders without reason may mean we ask for advance payment on future orders.",
          ]}
        />
      </Section>

      <Section id="returns-terms" title="Returns and exchanges">
        <p>
          Our{" "}
          <a href="/returns" className="font-medium text-brand underline underline-offset-2">
            returns policy
          </a>{" "}
          forms part of these terms. In short: {delivery.returnWindowDays} days,
          unused, with tags attached, subject to the exclusions listed there.
        </p>
      </Section>

      <Section id="products" title="Products and images">
        <Bullets
          items={[
            "We describe colours, fabrics and measurements as accurately as we can. Screens differ, and a slight colour variation is not a defect.",
            "Measurements are garment-measured and may vary by up to half an inch.",
            "Stock is limited. Listing an item does not guarantee availability until confirmed.",
          ]}
        />
      </Section>

      <Section id="ip" title="Use of this site">
        <Bullets
          items={[
            "The content, photographs and branding on this site belong to us and may not be reused commercially without permission.",
            "Do not attempt to disrupt the site or place orders you do not intend to accept.",
          ]}
        />
      </Section>

      <Section id="liability" title="Liability">
        <p>
          Our responsibility is limited to the value of the goods you ordered. We are
          not liable for indirect losses. Nothing here removes rights you have under
          Bangladeshi consumer law.
        </p>
      </Section>

      <Section id="law" title="Governing law">
        <p>
          These terms are governed by the laws of Bangladesh, and disputes fall to
          the courts of Dhaka.
        </p>
      </Section>

      <Section id="terms-contact" title="Contact">
        <p>
          {site.legalName}, {site.address}. Call{" "}
          <a
            href={`tel:${site.phone}`}
            className="tabular font-medium text-brand underline underline-offset-2"
          >
            {site.phoneDisplay}
          </a>{" "}
          or email{" "}
          <a
            href={`mailto:${site.email}`}
            className="font-medium text-brand underline underline-offset-2"
          >
            {site.email}
          </a>
          .
        </p>
      </Section>
    </Container>
  );
}
