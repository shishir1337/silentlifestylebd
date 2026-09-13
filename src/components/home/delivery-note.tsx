import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { CashIcon, PhoneIcon } from "@/components/ui/icons";
import { getSiteSettings } from "@/lib/settings";
import { Taka } from "@/components/ui/price";

/**
 * A second, fuller pass at the COD story — placed low, after the shopper has
 * seen product and is deciding whether to actually order. Repeating the
 * delivery terms here saves a trip to a policy page at the exact moment
 * hesitation peaks, and offers phone ordering for shoppers who don't trust
 * an online form yet.
 */
export async function DeliveryNote() {
  const site = await getSiteSettings();
  const { delivery } = site;

  return (
    <section aria-labelledby="cod-explainer" className="py-8 sm:py-12">
      <Container>
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-subtle">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
            <div>
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand text-on-brand">
                <CashIcon className="size-5" />
              </span>

              <h2
                id="cod-explainer"
                className="mt-4 text-[22px] leading-tight font-semibold sm:text-[28px]"
              >
                Order now, pay when it arrives.
              </h2>

              <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-ink-soft">
                No advance payment for Cash on Delivery orders. Check the parcel
                at your door, and pay the delivery man only if you keep it.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <ButtonLink href="/collections" size="md">
                  Start shopping
                </ButtonLink>
                <ButtonLink
                  href={`tel:${site.phone}`}
                  size="md"
                  variant="secondary"
                >
                  <PhoneIcon className="size-4" />
                  <span className="tabular">{site.phoneDisplay}</span>
                </ButtonLink>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 self-center sm:gap-y-6">
              <Fact
                label="Inside Dhaka"
                value={<Taka amount={delivery.insideDhaka} />}
                note={delivery.insideDhakaDays}
              />
              <Fact
                label="Outside Dhaka"
                value={<Taka amount={delivery.outsideDhaka} />}
                note={delivery.outsideDhakaDays}
              />
              <Fact
                label="Free delivery"
                value={<>Over <Taka amount={delivery.freeThreshold} /></>}
                note="Anywhere in Bangladesh"
              />
              <Fact
                label="Easy return"
                value={`${delivery.returnWindowDays} days`}
                note="Unused, with tags on"
              />
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Fact({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <div className="border-l-2 border-line-strong pl-3.5">
      <dt className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
        {label}
      </dt>
      <dd>
        <p className="tabular mt-1 text-[17px] leading-tight font-semibold sm:text-xl">
          {value}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{note}</p>
      </dd>
    </div>
  );
}
