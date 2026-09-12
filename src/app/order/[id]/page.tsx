import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";

export const metadata: Metadata = {
  title: "Order confirmed",
  // Nothing to rank for, and it renders a customer's name, phone and address.
  robots: { index: false, follow: false },
};

/**
 * Order confirmation.
 *
 * No `generateStaticParams`: order ids are minted at checkout, so there is no
 * build-time set to enumerate. The route renders a shell and the client reads
 * the order — which is also why it needs no server data of its own.
 */
export default async function OrderPage(props: PageProps<"/order/[id]">) {
  const { id } = await props.params;

  return (
    <Container>
      <OrderConfirmation id={id} />
    </Container>
  );
}
