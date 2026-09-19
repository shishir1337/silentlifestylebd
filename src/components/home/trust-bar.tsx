import { Container } from "@/components/ui/container";
import { CashIcon, PhoneIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";
import { getSiteSettings } from "@/lib/settings";
import { Taka } from "@/components/ui/price";

/**
 * The COD objection-handling strip. Every line answers a question a first-time
 * Bangladeshi shopper asks before adding to bag: can I pay later, what does
 * delivery cost, how fast, and what if it doesn't fit.
 *
 * 2×2 on phones so nothing shrinks below a readable size; a single row from
 * `lg`. Concrete numbers only — "fast delivery" persuades nobody.
 */
export async function TrustBar() {
  const { delivery } = await getSiteSettings();

  const items: {
    Icon: typeof CashIcon;
    title: string;
    body: React.ReactNode;
  }[] = [
    {
      Icon: CashIcon,
      title: "Cash on Delivery",
      body: "Pay only when the parcel reaches your hand.",
    },
    {
      Icon: TruckIcon,
      title: "Delivery charge",
      body: (
        <>
          <Taka amount={delivery.insideDhaka} /> inside Dhaka ·{" "}
          <Taka amount={delivery.outsideDhaka} /> outside.
        </>
      ),
    },
    {
      /*
        This slot used to promise a seven-day return. The shop does not offer
        one — it never did — and a promise a customer only discovers is untrue
        when they try to use it costs more than the sale it won.

        What is here instead is the thing a cash-on-delivery shopper actually
        wants to know, and it is already true: somebody rings before the parcel
        moves. See the order confirmation, which says the same.
      */
      Icon: PhoneIcon,
      title: "We call first",
      body: "Every order is confirmed by phone before it is sent.",
    },
    {
      Icon: ShieldIcon,
      title: "100% authentic",
      body: "Checked before dispatch. No copy products.",
    },
  ];

  return (
    <section aria-label="Why shop with us" className="border-y border-line bg-subtle">
      <Container>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 py-8 lg:grid-cols-4 lg:py-10">
          {items.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] leading-tight font-semibold sm:text-sm">
                  {title}
                </p>
                <p className="mt-1 text-[12px] leading-snug text-ink-muted sm:text-[13px]">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
