import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-shell";
import { OrderDetail } from "@/components/admin/order-detail";
import { requireStaff } from "@/lib/dal";
import { getOrder } from "@/lib/admin/order-reads";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

/**
 * One order.
 *
 * Any staff role reaches it — moving parcels through the flow is what a Staff
 * account is for. Which *transitions* they are offered is decided per role
 * inside the component, and enforced again in the action, because a button
 * that is not rendered is not a permission check.
 */
export default async function AdminOrderPage(props: PageProps<"/admin/orders/[orderNo]">) {
  const staff = await requireStaff();
  const { orderNo } = await props.params;
  const order = await getOrder(orderNo.toUpperCase());
  if (!order) notFound();

  return (
    <AdminPage
      title={order.orderNo}
      lead={`${order.customerName} · ${order.items.length} ${order.items.length === 1 ? "item" : "items"}`}
      action={
        <Link
          href="/admin/orders"
          className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-line-strong bg-canvas px-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink print:hidden"
        >
          Back to orders
        </Link>
      }
    >
      <OrderDetail order={order} role={staff.role} />
    </AdminPage>
  );
}
