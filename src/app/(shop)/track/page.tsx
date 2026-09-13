import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { OrderTracker } from "@/components/checkout/order-tracker";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Enter your Silent Lifestyle BD order number to see where your parcel is.",
  alternates: { canonical: "/track" },
};

export default function TrackPage() {
  return (
    <Container>
      <PageHeader
        breadcrumb="Track your order"
        title="Track your order"
        lead="Enter the order number from your confirmation, or pick one of your recent orders."
      />
      <OrderTracker />
    </Container>
  );
}
