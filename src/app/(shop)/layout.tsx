import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/layout/cart-drawer";

/**
 * The storefront.
 *
 * Everything a shopper sees lives in this route group: the announcement bar,
 * the header, the footer, the mobile tab bar and the cart. The group's
 * parentheses keep it out of the URL, so nothing about the addresses changed.
 *
 * It exists because the admin panel was inheriting all of it. A back office
 * wrapped in "Free delivery over ৳3,000" and a shopping-bag tab bar is not a
 * back office — and the cart provider was mounting on every admin screen for a
 * person who is not shopping.
 */
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    /*
      Bottom padding clears the fixed mobile tab bar for ALL content, footer
      included — putting it on <main> would leave the footer's last rows
      sitting underneath the bar.
    */
    <div className="flex min-h-full flex-col pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[var(--z-drawer)] focus:rounded-[var(--radius-sm)] focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <CartProvider>
        <AnnouncementBar />
        <SiteHeader />

        <main id="main" className="flex-1">
          {children}
        </main>

        <SiteFooter />
        <MobileTabBar />
        <CartDrawer />
      </CartProvider>
    </div>
  );
}
