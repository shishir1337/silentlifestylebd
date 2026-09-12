"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BagIcon, GridIcon, PinIcon, UserIcon } from "@/components/ui/icons";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/cn";

const items = [
  { href: "/account", label: "Overview", Icon: GridIcon },
  { href: "/account/orders", label: "Orders", Icon: BagIcon },
  { href: "/account/addresses", label: "Addresses", Icon: PinIcon },
  { href: "/account/profile", label: "Profile", Icon: UserIcon },
] as const;

/**
 * Dashboard navigation.
 *
 * A scroll-snap chip rail on phones and a sidebar from `lg` — the same pattern
 * the collection pages use, so the account area does not feel like a different
 * product. `aria-current` marks the active section for screen readers rather
 * than relying on colour alone.
 */
export function AccountNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/account" ? pathname === "/account" : pathname.startsWith(href);

  // `min-w-0` below is load-bearing: this nav is a grid child, and grid items
  // default to `min-width: auto`, so the scroll rail inside refused to shrink
  // below its own 480px content width and stretched the whole column past the
  // viewport. The rail's own `overflow-x: auto` cannot clip what the column has
  // already sized itself around.
  return (
    <nav
      aria-label="Account"
      className="min-w-0 lg:sticky lg:top-24 lg:self-start"
    >
      <ul className="rail rail-bleed gap-2 pb-1 lg:flex lg:flex-col lg:gap-1 lg:overflow-visible">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-[var(--dur-base)]",
                  "lg:w-full lg:rounded-[var(--radius-sm)] lg:border-transparent lg:px-3 lg:text-[14px]",
                  active
                    ? "border-ink bg-ink text-white lg:border-transparent lg:bg-subtle lg:text-ink"
                    : "border-line-strong bg-surface text-ink-soft hover:border-ink hover:text-ink lg:bg-transparent lg:hover:bg-subtle",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Sidebar only. On a phone the rail is a horizontal scroller, and a
          destructive-ish control at the end of one is easy to hit by accident
          while swiping — it lives at the foot of the overview page there. */}
      <div className="mt-2 hidden border-t border-line pt-2 lg:block">
        <SignOutButton className="w-full justify-start" />
      </div>
    </nav>
  );
}
