import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SearchIcon, UserIcon } from "@/components/ui/icons";
import { CartButton } from "./cart-button";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { getCategories, getCategoryCounts, getNav } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/**
 * Sticky on every breakpoint. On mobile the search field is a persistent row
 * rather than an icon that opens an overlay: search is the second-highest
 * intent action after tapping a category, and hiding it behind a tap costs
 * more than the 44px it occupies.
 *
 * The header is in the root layout, so this read happens once per prerendered
 * page. It is cached and tagged, so a category rename is one `revalidateTag`
 * away from appearing in every menu on the site.
 */
export async function SiteHeader() {
  const [categories, counts, nav] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
    getNav(),
  ]);
  const menuCategories = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: counts[c.slug] ?? 0,
  }));

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-canvas/95 backdrop-blur-sm supports-[backdrop-filter]:bg-canvas/80">
      <Container>
        <div className="flex h-14 items-center gap-2 sm:h-16 sm:gap-4">
          <MobileMenu categories={menuCategories} nav={nav} />

          <Logo className="mr-auto" />


          {/* Desktop primary nav */}
          <nav className="hidden lg:block" aria-label="Primary">
            <ul className="flex items-center gap-1">
              {nav.primary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "inline-flex h-10 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium transition-colors duration-[var(--dur-base)] hover:bg-muted",
                      item.highlight && "text-sale",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop search */}
          <form
            action="/search"
            role="search"
            className="ml-2 hidden max-w-xs min-w-0 flex-1 lg:block"
          >
            <label htmlFor="search-desktop" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                id="search-desktop"
                name="q"
                type="search"
                placeholder="Search panjabi, shirts, watches…"
                className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-subtle pr-3 pl-9 text-sm placeholder:text-ink-muted focus:border-brand focus:bg-canvas focus:outline-none"
              />
            </div>
          </form>

          <div className="flex items-center">
            <Link
              href="/account"
              aria-label="Your account"
              className="hidden size-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--dur-base)] hover:bg-muted sm:inline-flex"
            >
              <UserIcon className="size-[21px]" />
            </Link>

            <CartButton />
          </div>
        </div>

        {/* Mobile search — always visible, never behind a tap */}
        <form action="/search" role="search" className="pb-2.5 lg:hidden">
          <label htmlFor="search-mobile" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-muted" />
            <input
              id="search-mobile"
              name="q"
              type="search"
              enterKeyHint="search"
              placeholder="Search for panjabi, shirts, watches…"
              /* 16px min: anything smaller makes iOS Safari zoom on focus. */
              className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-subtle pr-3 pl-10 text-base placeholder:text-ink-muted focus:border-brand focus:bg-canvas focus:outline-none"
            />
          </div>
        </form>
      </Container>
    </header>
  );
}
