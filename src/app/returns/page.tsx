import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { PhoneIcon } from "@/components/ui/icons";
import { delivery, site } from "@/data/site";

export const metadata: Metadata = {
  title: "Returns & exchange",
  description: `Our ${delivery.returnWindowDays}-day return and exchange policy. What we take back, what we don't, and how to arrange it.`,
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <Container>
      <PageHeader
        breadcrumb="Returns & exchange"
        title={`${delivery.returnWindowDays}-day returns & exchange`}
        lead="Wrong size or changed your mind? Send it back within seven days of delivery."
      />

      <Section id="how" title="How to arrange it">
        <p>
          Call or WhatsApp us on{" "}
          <a
            href={`tel:${site.phone}`}
            className="tabular font-medium text-brand underline underline-offset-2"
          >
            {site.phoneDisplay}
          </a>{" "}
          with your order number. We will arrange a courier pickup, or you can drop
          the parcel at our store.
        </p>
        <Bullets
          items={[
            "Tell us whether you want an exchange or a refund.",
            "For exchanges, tell us the size or colour you want instead.",
            "Keep the item, its tags and the original packaging together.",
          ]}
        />
      </Section>

      <Section id="accepted" title="What we take back">
        <Bullets
          items={[
            "Unused items with the tags still attached.",
            "Wrong item, wrong size or wrong colour sent by us.",
            "Manufacturing defects — a fault in stitching, fabric or hardware.",
            "Items damaged in transit, reported within 48 hours of delivery.",
          ]}
        />
      </Section>

      <Section id="not-accepted" title="What we cannot take back">
        <Bullets
          items={[
            "Items that have been worn, washed or altered.",
            "Items returned without tags or original packaging.",
            "Innerwear and socks, for hygiene reasons.",
            "Unstitched fabric that has already been cut or tailored.",
            <>Anything reported after {delivery.returnWindowDays} days of delivery.</>,
          ]}
        />
      </Section>

      <Section id="refunds" title="Refunds">
        <p>
          Because orders are paid in cash on delivery, refunds are sent by bKash or
          Nagad to the number on the order — or in cash if you return the item to our
          store in person.
        </p>
        <Bullets
          items={[
            "Refunds are issued within 3–5 working days of us receiving the item back.",
            "We refund the item price in full.",
            "The original delivery charge is refunded only when the return is our mistake.",
            "Return courier cost is on us for our mistakes, and on you for a change of mind.",
          ]}
        />
      </Section>

      <Section id="exchange" title="Exchanges">
        <p>
          Exchanges are the faster route for a size change and are free within Dhaka.
          If the replacement costs more, you pay the difference on delivery; if it
          costs less, we refund the difference.
        </p>
      </Section>

      <div className="flex flex-col gap-2.5 border-t border-line py-6 sm:flex-row">
        <ButtonLink href={`tel:${site.phone}`} className="sm:flex-1">
          <PhoneIcon className="size-4" />
          Call to arrange a return
        </ButtonLink>
        <ButtonLink href="/size-guide" variant="secondary" className="sm:flex-1">
          Check the size guide
        </ButtonLink>
      </div>
    </Container>
  );
}
