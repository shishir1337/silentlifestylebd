"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

/**
 * Admin navigation.
 *
 * Sections the signed-in role cannot use are not rendered at all — a disabled
 * tab invites the question "why not, and how do I turn it on?", which for a
 * non-technical operator is a support call. Hiding is presentation only: the
 * pages behind these links check the role themselves, so a typed URL is no way
 * in.
 */
const SECTIONS = [
  { href: "/admin", label: "Overview", roles: ["OWNER", "MANAGER", "STAFF"] },
  { href: "/admin/orders", label: "Orders", roles: ["OWNER", "MANAGER", "STAFF"] },
  { href: "/admin/products", label: "Products", roles: ["OWNER", "MANAGER"] },
  { href: "/admin/categories", label: "Categories", roles: ["OWNER", "MANAGER"] },
  { href: "/admin/media", label: "Media", roles: ["OWNER", "MANAGER"] },
] as const;

export function AdminNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const visible = SECTIONS.filter((s) => (s.roles as readonly string[]).includes(role));

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav aria-label="Admin sections" className="border-b border-line bg-canvas">
      <Container>
        {/* A scroll rail on phones — the client will confirm orders from one. */}
        <ul className="rail rail-bleed -mb-px gap-1 sm:flex sm:overflow-visible">
          {visible.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center border-b-2 px-3 text-[14px] font-medium whitespace-nowrap transition-colors duration-[var(--dur-base)]",
                    active
                      ? "border-ink text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </nav>
  );
}
