import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { PhoneIcon } from "@/components/ui/icons";
import { getOrderForViewer } from "@/lib/order-reads";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Order confirmed",
  // Nothing to rank for, and it renders a customer's name, phone and address.
  robots: { index: false, follow: false },
};

/**
 * Order confirmation.
 *
 * Dynamic by necessity: the order is a row, and whether *this* visitor may see
 * it depends on their session and their cookies. `getOrderForViewer` returns
 * null for anyone else, and this page cannot tell the difference between "no
 * such order" and "not yours" — which is the point. Distinguishing them would
 * turn the page into a way to confirm which order numbers exist.
 */
export default async function OrderPage(props: PageProps<"/order/[id]">) {
  const { id } = await props.params;
  const order = await getOrderForViewer(id.toUpperCase());

  if (!order) {
    return (
      <Container>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-[17px] font-medium">We can&apos;t find that order</p>
          <p className="max-w-md text-[14px] leading-relaxed text-ink-muted">
            Order <span className="tabular font-medium">{id}</span> isn&apos;t one we
            can show you here. If you placed it in another browser, look it up with
            your order number and phone on the{" "}
            <Link
              href="/track"
              className="font-medium text-brand underline underline-offset-2"
            >
              tracking page
            </Link>
            , or call us and we will find it for you.
          </p>
          <a
            href={`tel:${site.phone}`}
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-ink px-5 text-sm font-medium text-white"
          >
            <PhoneIcon className="size-4" />
            <span className="tabular">{site.phoneDisplay}</span>
          </a>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <OrderConfirmation order={order} />
    </Container>
  );
}
