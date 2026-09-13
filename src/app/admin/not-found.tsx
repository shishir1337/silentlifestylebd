import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-shell";
import { Card } from "@/components/admin/admin-ui";

/**
 * A row that is not there.
 *
 * Reached by `notFound()` from an order, product, customer or page route —
 * nearly always a bookmark to something since deleted, or an order number
 * typed by hand with a digit wrong. So the copy names those two causes and
 * points at the lists, rather than saying "404".
 */
const PLACES = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/content", label: "Content" },
];

export default function AdminNotFound() {
  return (
    <AdminPage
      title="Not found"
      lead="There is nothing at this address. It was probably deleted, or the link has a typo in it."
    >
      <Card className="max-w-[560px] p-5">
        <h2 className="text-[14px] font-semibold">Try one of these</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {PLACES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="flex h-11 items-center rounded-[var(--radius-sm)] border border-line px-3 text-[13.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
          Looking for a particular order? Search the order number on the Orders
          page — it finds part-matches, so the first few characters are enough.
        </p>
      </Card>
    </AdminPage>
  );
}
