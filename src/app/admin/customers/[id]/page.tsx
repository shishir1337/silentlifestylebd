import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card, Pill, SectionTitle, Stat } from "@/components/admin/admin-ui";
import { Taka } from "@/components/ui/price";
import { PhoneIcon } from "@/components/ui/icons";
import { requireStaff } from "@/lib/dal";
import { getCustomer } from "@/lib/admin/people-reads";
import { ORDER_STATUS, STATUS_CHIP } from "@/lib/order-status";
import { formatOrderDate } from "@/lib/orders";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Customer",
  robots: { index: false, follow: false },
};

/**
 * One customer.
 *
 * What support actually needs when somebody rings: who they are, how to call
 * them back, what they have ordered and where it goes. Nothing here is
 * editable — an address that needs correcting is corrected on the order it
 * affects, where the change is recorded against that delivery instead of
 * silently altering the customer's saved book.
 */
export default async function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  await requireStaff();
  const { id } = await props.params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <AdminPage
      title={customer.name}
      lead={customer.email}
      action={
        <Link
          href="/admin/customers"
          className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-line-strong bg-canvas px-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
        >
          Back to customers
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={customer.orderCount} />
        <Stat
          label="Spent"
          value={<Taka amount={customer.totalSpent} />}
          hint="cancelled and returned excluded"
          tone={customer.totalSpent > 0 ? "good" : "neutral"}
        />
        <Stat
          label="Last order"
          value={customer.lastOrderAt ? formatOrderDate(customer.lastOrderAt) : "—"}
        />
        <Stat label="Joined" value={formatOrderDate(customer.joinedAt)} />
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle>Orders</SectionTitle>
          {customer.orders.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-muted">
              No orders on this account yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {customer.orders.map((o) => (
                <li key={o.orderNo}>
                  <Link
                    href={`/admin/orders/${o.orderNo}`}
                    className="block px-4 py-3 transition-colors duration-[var(--dur-base)] hover:bg-subtle"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="tabular text-[13px] font-semibold">{o.orderNo}</span>
                      <Taka amount={o.total} className="shrink-0 text-[13px] font-semibold" />
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-[12px] text-ink-muted">
                        {formatOrderDate(o.placedAt)} · {o.itemCount}{" "}
                        {o.itemCount === 1 ? "item" : "items"}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                          STATUS_CHIP[ORDER_STATUS[o.status].tone],
                        )}
                      >
                        {ORDER_STATUS[o.status].label}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-4">
            <h2 className="text-[14px] font-semibold">Contact</h2>
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="tabular mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-brand px-3 text-[13.5px] font-medium text-on-brand transition-colors duration-[var(--dur-base)] hover:bg-brand-hover"
              >
                <PhoneIcon className="size-4" />
                {customer.phone}
              </a>
            ) : (
              <p className="mt-2 text-[13px] text-ink-muted">
                No phone on the account. Their orders carry one.
              </p>
            )}
            <p className="mt-2.5 text-[12.5px] break-all text-ink-soft">{customer.email}</p>
            {customer.isStaff ? (
              <p className="mt-2.5 border-t border-line pt-2.5 text-[12.5px] text-ink-muted">
                <Pill>Staff</Pill> This account can sign in to the admin panel.
              </p>
            ) : null}
          </Card>

          <Card>
            <SectionTitle>Saved addresses</SectionTitle>
            {customer.addresses.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
                None saved. They type one at checkout.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium">{a.label}</p>
                      {a.isDefault ? <Pill tone="on">Default</Pill> : null}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                      {a.recipient}
                      <br />
                      <span className="tabular">{a.phone}</span>
                      <br />
                      {a.address}
                    </p>
                    <p className="mt-1 text-[11.5px] text-ink-muted">
                      {a.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p className="px-1 text-[12px] leading-relaxed text-ink-muted">
            Nothing here can be edited from the panel. If a delivery address is
            wrong, correct it on the order — the change is recorded there and
            only affects that parcel.
          </p>
        </div>
      </div>
    </AdminPage>
  );
}
