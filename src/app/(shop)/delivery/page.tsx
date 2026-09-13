import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader, Section, Bullets } from "@/components/ui/page-header";
import { Taka } from "@/components/ui/price";
import { ButtonLink } from "@/components/ui/button";
import { CashIcon, TruckIcon } from "@/components/ui/icons";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Delivery & charges",
  description:
    "Delivery charges, timelines and how cash on delivery works at Silent Lifestyle BD. Inside Dhaka and nationwide.",
  alternates: { canonical: "/delivery" },
};

/**
 * Every number on this page comes from the settings rows — the same source the
 * homepage, product page, drawer and checkout read, and the same rows the
 * client edits. A policy page that contradicts the checkout is worse than no
 * policy page, and that is exactly what a second copy of these numbers would
 * eventually become.
 */
export default async function DeliveryPage() {
  const site = await getSiteSettings();
  const { delivery } = site;

  return (
    <Container>
      <PageHeader
        breadcrumb="Delivery & charges"
        title="Delivery & charges"
        lead="What it costs, how long it takes, and how paying on delivery works."
      />

      <div className="grid gap-3 pb-2 sm:grid-cols-2">
        <RateCard
          area="Inside Dhaka"
          charge={delivery.insideDhaka}
          eta={delivery.insideDhakaDays}
        />
        <RateCard
          area="Outside Dhaka"
          charge={delivery.outsideDhaka}
          eta={delivery.outsideDhakaDays}
        />
      </div>

      <p className="mb-2 flex items-center gap-2 rounded-[var(--radius-sm)] bg-brand-tint px-3.5 py-3 text-[13px] font-medium text-brand">
        <TruckIcon className="size-4 shrink-0" />
        <span>
          Delivery is free on every order over{" "}
          <Taka amount={delivery.freeThreshold} className="font-semibold" /> — anywhere
          in Bangladesh.
        </span>
      </p>

      <Section id="how-cod-works" title="How cash on delivery works">
        <p>
          There is no advance payment. We call to confirm your order, hand it to a
          courier, and you pay the delivery man in cash when the parcel reaches you.
        </p>
        <Bullets
          items={[
            "You may open and check the parcel before paying.",
            "If it is not what you ordered, refuse it — you pay nothing.",
            <>
              Keep the exact amount ready if you can; delivery riders rarely carry
              change for large notes.
            </>,
          ]}
        />
      </Section>

      <Section id="timelines" title="Timelines">
        <Bullets
          items={[
            <>
              <strong className="font-medium text-ink">Inside Dhaka:</strong>{" "}
              {delivery.insideDhakaDays} after confirmation.
            </>,
            <>
              <strong className="font-medium text-ink">Outside Dhaka:</strong>{" "}
              {delivery.outsideDhakaDays} after confirmation, depending on your
              district.
            </>,
            "Orders placed after 6pm are confirmed the next working day.",
            "Deliveries pause on government holidays and during Eid rush periods, when districts outside Dhaka can take an extra day or two.",
          ]}
        />
      </Section>

      <Section id="before-you-order" title="Before you order">
        <Bullets
          items={[
            "Give a mobile number you actually answer — unconfirmed orders are not dispatched.",
            "Write the full address: house or flat, road, area and district.",
            "Add a landmark in the order note if your area is hard to find.",
            "Add an alternative number if you are often unreachable.",
          ]}
        />
      </Section>

      <Section id="charges-note" title="A note on charges">
        <p>
          The delivery charge is calculated on the goods subtotal, not the total —
          so a charge can never push an order over the free-delivery threshold and
          pay for its own removal. You will see the exact amount at checkout before
          you place the order.
        </p>
      </Section>

      <div className="flex flex-col gap-2.5 border-t border-line py-6 sm:flex-row">
        <ButtonLink href="/collections" className="sm:flex-1">
          Start shopping
        </ButtonLink>
        <ButtonLink href="/track" variant="secondary" className="sm:flex-1">
          Track your order
        </ButtonLink>
        <ButtonLink href={`tel:${site.phone}`} variant="secondary" className="sm:flex-1">
          Call {site.phoneDisplay}
        </ButtonLink>
      </div>
    </Container>
  );
}

function RateCard({
  area,
  charge,
  eta,
}: {
  area: string;
  charge: number;
  eta: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-subtle p-4">
      <p className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
        {area}
      </p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <Taka amount={charge} className="text-2xl font-semibold" />
        <span className="text-[13px] text-ink-muted">delivery</span>
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft">
        <CashIcon className="size-4 shrink-0 text-brand" />
        Cash on delivery · {eta}
      </p>
    </div>
  );
}
