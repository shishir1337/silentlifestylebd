"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Sub-navigation inside Content.
 *
 * Four things that are all "the words and pictures on the shop", grouped under
 * one sidebar entry rather than four. A sidebar with nine items is a list to
 * read; one with five is a place to go.
 */
const TABS = [
  { href: "/admin/content/banners", label: "Banners" },
  { href: "/admin/content/tiles", label: "Tiles" },
  { href: "/admin/content/size-charts", label: "Size charts" },
  { href: "/admin/content/navigation", label: "Menus" },
];

export function ContentTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Content sections" className="border-b border-line">
      <ul className="rail rail-bleed -mb-px gap-1 sm:flex sm:overflow-visible">
        {TABS.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center border-b-2 px-3 text-[13.5px] font-medium whitespace-nowrap",
                  "transition-colors duration-[var(--dur-base)]",
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
    </nav>
  );
}
