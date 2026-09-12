"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BagIcon, GridIcon, HomeIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useCart } from "@/lib/cart";

const links = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/collections", label: "Shop", Icon: GridIcon },
] as const;

const trailing = [{ href: "/account", label: "Account", Icon: UserIcon }] as const;

/**
 * Four destinations, icon + label on every one (icon-only tab bars measurably
 * hurt discoverability). Phone-only: from `lg` up the header nav does this job
 * and a second navigation at the same level would just compete.
 *
 * "Bag" is a button, not a link — it opens the same drawer the header bag does.
 * Navigating away to a cart page from here would drop the shopper out of the
 * grid they were scrolling.
 *
 * `<body>` carries matching bottom padding so nothing ever hides behind this.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { count, ready, openDrawer } = useCart();
  const cartCount = ready ? count : 0;

  const itemClass = (active: boolean) =>
    cn(
      "relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors duration-[var(--dur-base)]",
      active ? "text-brand" : "text-ink-muted",
    );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-canvas/95 backdrop-blur-sm safe-bottom supports-[backdrop-filter]:bg-canvas/85 lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {links.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={itemClass(active)}
              >
                <Icon className="size-[22px]" />
                <span className="text-[10px] leading-none font-medium">{label}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            type="button"
            onClick={openDrawer}
            aria-haspopup="dialog"
            aria-label={`Open bag, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className={itemClass(false)}
          >
            <span className="relative">
              <BagIcon className="size-[22px]" />
              {cartCount > 0 ? (
                <span className="tabular absolute -top-1 -right-2 inline-flex min-w-[16px] items-center justify-center rounded-full bg-sale px-1 text-[9px] leading-4 font-semibold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </span>
            <span className="text-[10px] leading-none font-medium">Bag</span>
          </button>
        </li>

        {trailing.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={itemClass(active)}
              >
                <Icon className="size-[22px]" />
                <span className="text-[10px] leading-none font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
