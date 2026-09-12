"use client";

import { useEffect, useState } from "react";
import { useOverlay } from "@/lib/use-overlay";
import Link from "next/link";
import { CloseIcon, MenuIcon, PhoneIcon } from "@/components/ui/icons";
import { nav, site } from "@/data/site";

/**
 * Just enough of a category to draw a menu row.
 *
 * Deliberately not the full `Category`: this is a client component, so every
 * field crosses into the RSC payload on every page. The image alone — URL plus
 * its inlined blur placeholder — is about 400 bytes a row that this menu never
 * renders.
 */
export interface MenuCategory {
  slug: string;
  name: string;
  count: number;
}

/**
 * The only meaningful client-side JavaScript on this page.
 *
 * Uses a native <dialog> so the browser gives us the focus trap, the Escape
 * handler and inert background for free — an inlined re-implementation of all
 * three would be more code and worse behaviour.
 *
 * Categories are a prop because this runs in the browser and the catalogue is
 * in Postgres. `SiteHeader` reads them on the server and passes them down.
 */
export function MobileMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const { mounted, ref: attach, node } = useOverlay(open);

  // Keep React state honest when the browser closes the dialog itself
  // (Escape key, backdrop dismissal on some platforms).
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const onClose = () => setOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [mounted, node]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-ml-2 inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-ink transition-colors duration-[var(--dur-base)] hover:bg-muted active:bg-line lg:hidden"
      >
        <MenuIcon className="size-[22px]" />
      </button>

      {mounted ? (
      <dialog
        ref={attach}
        onClick={(e) => {
          // Clicking the backdrop (i.e. the dialog element itself) closes.
          if (e.target === node.current) setOpen(false);
        }}
        className="overlay overlay-left fixed inset-y-0 left-0 right-auto m-0 flex h-dvh max-h-none w-[86vw] max-w-[360px] flex-col bg-canvas p-0 text-ink"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <span className="font-display text-base font-semibold tracking-tight">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--dur-base)] hover:bg-muted"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          <ul className="mb-2">
            {nav.primary.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-[var(--radius-sm)] px-3 text-[15px] font-medium transition-colors duration-[var(--dur-base)] hover:bg-muted"
                >
                  <span className={"highlight" in item && item.highlight ? "text-sale" : undefined}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
            Shop by category
          </p>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/collections/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-between rounded-[var(--radius-sm)] px-3 text-sm transition-colors duration-[var(--dur-base)] hover:bg-muted"
                >
                  <span>{c.name}</span>
                  <span className="tabular text-xs text-ink-muted">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line p-4 safe-bottom">
          <a
            href={`tel:${site.phone}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-brand-tint text-sm font-medium text-brand"
          >
            <PhoneIcon className="size-4" />
            Order by phone: {site.phoneDisplay}
          </a>
        </div>
      </dialog>
      ) : null}
    </>
  );
}
