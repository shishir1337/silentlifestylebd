import Link from "next/link";
import { Taka } from "@/components/ui/price";
import { Card, Pill, EmptyState, TableScroll } from "./admin-ui";
import { formatOrderDate } from "@/lib/orders";
import type { CustomerRow } from "@/lib/admin/people-reads";

/**
 * People with accounts.
 *
 * A Server Component: there is nothing to do here but read. Customer records
 * are not editable from the panel on purpose — a shop has no business quietly
 * rewriting somebody's name or email, and support requests that genuinely need
 * it ("they mistyped their address") are answered on the order, where the
 * change is audited and only affects that delivery.
 *
 * Guests are absent by design, not by oversight. They are fully visible on
 * their own orders and searchable by phone; what they are not is collected
 * into a contact list nobody asked the shop to build.
 */
export function CustomerTable({
  rows,
  filtered,
}: {
  rows: CustomerRow[];
  filtered: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={filtered ? "Nobody matches that" : "No accounts yet"}
        body={
          filtered
            ? "Try part of a name, an email address, or a phone number."
            : "Shoppers can order without an account, so this stays empty until somebody creates one."
        }
      />
    );
  }

  return (
    <>
      <Card className="hidden md:block">
        <TableScroll>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                <th scope="col" className="px-4 py-2.5 font-semibold">Customer</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Phone</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Orders</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Spent</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Last order</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors duration-[var(--dur-base)] hover:bg-subtle"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="text-[13.5px] font-medium hover:text-brand"
                    >
                      {c.name}
                    </Link>
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
                      {c.email}
                    </span>
                    {c.isStaff ? (
                      <span className="mt-1 inline-block">
                        <Pill>Staff</Pill>
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        className="tabular text-[12.5px] text-brand hover:underline"
                      >
                        {c.phone}
                      </a>
                    ) : (
                      <span className="text-[12.5px] text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-[13px]">{c.orderCount}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Taka amount={c.totalSpent} className="text-[13px] font-semibold" />
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink-soft">
                    {c.lastOrderAt ? formatOrderDate(c.lastOrderAt) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[12.5px] text-ink-muted">
                    {formatOrderDate(c.joinedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>

      <ul className="space-y-2 md:hidden">
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              href={`/admin/customers/${c.id}`}
              className="block rounded-[var(--radius-md)] border border-line bg-canvas p-3 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{c.name}</p>
                  <p className="truncate text-[12px] text-ink-muted">{c.email}</p>
                  {c.phone ? (
                    <p className="tabular mt-0.5 text-[12px] text-ink-soft">{c.phone}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <Taka amount={c.totalSpent} className="text-[14px] font-semibold" />
                  <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                    {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
