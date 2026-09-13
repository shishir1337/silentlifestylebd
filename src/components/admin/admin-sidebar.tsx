"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import {
  CategoriesIcon,
  CollectionsIcon,
  CustomersIcon,
  DashboardIcon,
  ContentIcon,
  MediaIcon,
  OrdersIcon,
  ProductsIcon,
  ShopIcon,
} from "./admin-icons";
import { cn } from "@/lib/cn";

/**
 * Admin navigation.
 *
 * A persistent sidebar from `lg` up, a slide-in drawer below it — the adaptive
 * pattern rather than a bottom bar, because this is secondary navigation into a
 * tool, not the top level of a consumer app. It stays on screen at desktop
 * widths so the operator always knows where they are and what else exists;
 * moving between orders and products should never cost a hunt for a menu.
 *
 * Sections the signed-in role cannot use are not rendered. A disabled tab
 * invites "why not, and how do I turn it on?", which for a non-technical
 * operator is a phone call. Hiding is presentation only — every page behind
 * these links checks the role itself, so a typed URL is no way in.
 */

interface Section {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  roles: StaffRole[];
  /** Shown as a small count, e.g. orders waiting to be confirmed. */
  badge?: number;
}

export function AdminSidebar({
  role,
  pendingOrders,
  onNavigate,
}: {
  role: StaffRole;
  pendingOrders: number;
  /** Closes the drawer on mobile after a tap. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const sections: Section[] = [
    { href: "/admin", label: "Dashboard", Icon: DashboardIcon, roles: ["OWNER", "MANAGER", "STAFF"] },
    {
      href: "/admin/orders",
      label: "Orders",
      Icon: OrdersIcon,
      roles: ["OWNER", "MANAGER", "STAFF"],
      badge: pendingOrders,
    },
    { href: "/admin/products", label: "Products", Icon: ProductsIcon, roles: ["OWNER", "MANAGER"] },
    { href: "/admin/categories", label: "Categories", Icon: CategoriesIcon, roles: ["OWNER", "MANAGER"] },
    { href: "/admin/collections", label: "Collections", Icon: CollectionsIcon, roles: ["OWNER", "MANAGER"] },
    { href: "/admin/customers", label: "Customers", Icon: CustomersIcon, roles: ["OWNER", "MANAGER", "STAFF"] },
    { href: "/admin/content", label: "Content", Icon: ContentIcon, roles: ["OWNER", "MANAGER"] },
    { href: "/admin/media", label: "Media", Icon: MediaIcon, roles: ["OWNER", "MANAGER"] },
  ];

  const visible = sections.filter((s) => s.roles.includes(role));
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col bg-[var(--admin-nav)] text-[var(--admin-nav-ink)]">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-[var(--radius-sm)] text-[14px] font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          <span className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-brand text-[12px] font-bold text-on-brand">
            SL
          </span>
          Silent Lifestyle
        </Link>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-2.5 py-3">
        <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-[var(--admin-nav-dim)] uppercase">
          Manage
        </p>
        <ul className="space-y-0.5">
          {visible.map(({ href, label, Icon, badge }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // 44px tall: this is tapped on a phone all day.
                    "flex h-11 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[14px] font-medium",
                    "transition-colors duration-[var(--dur-base)] [transition-timing-function:var(--ease-out-soft)]",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
                    active
                      ? "bg-white/12 text-white"
                      : "text-[var(--admin-nav-ink)] hover:bg-white/6 hover:text-white",
                  )}
                >
                  {/* An active marker that is not colour alone. */}
                  <span
                    aria-hidden
                    className={cn(
                      "h-5 w-[3px] shrink-0 rounded-full transition-colors duration-[var(--dur-base)]",
                      active ? "bg-brand" : "bg-transparent",
                    )}
                  />
                  <Icon className="size-[18px] shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {badge && badge > 0 ? (
                    <span className="tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-on-brand">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2.5">
        {/*
          The live shop, not a preview. Trusting an edit means seeing it where
          the customer sees it. Opens in a new tab so the operator does not lose
          the screen they were working on.
        */}
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className="flex h-11 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] font-medium text-[var(--admin-nav-dim)] transition-colors duration-[var(--dur-base)] hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          <span aria-hidden className="w-[3px] shrink-0" />
          <ShopIcon className="size-[18px] shrink-0" />
          View shop
        </Link>
      </div>
    </div>
  );
}
