import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { site } from "@/data/site";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/layout/cart-drawer";

/**
 * Two variable families, latin only, self-hosted by next/font — no render-
 * blocking request to Google and no layout shift when they land.
 * Inter carries body and every price; Jakarta carries headings only.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["600", "700"],
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Fashion & Accessories in Bangladesh`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "online shopping bangladesh",
    "panjabi",
    "formal shirt",
    "gabardine pant",
    "leather belt",
    "wallet",
    "ladies purse",
    "watch",
    "Pakistani stitched collection",
    "cash on delivery",
  ],
  openGraph: {
    type: "website",
    locale: "en_BD",
    siteName: site.name,
    title: `${site.name} — Fashion & Accessories in Bangladesh`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Fashion & Accessories in Bangladesh`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays enabled — capping it is an accessibility failure.
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-BD"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      {/* Bottom padding clears the fixed mobile tab bar for ALL content,
          footer included — putting it on <main> would leave the footer's last
          rows sitting underneath the bar. */}
      {/*
        Browser extensions routinely stamp attributes onto <body> before React
        hydrates — ColorZilla adds `cz-shortcut-listen`, password managers and
        grammar checkers do the same — and each one surfaces as a hydration
        mismatch the app cannot fix. `suppressHydrationWarning` applies only to
        this element's own attributes and text, one level deep, so genuine
        mismatches anywhere inside the tree are still reported.
      */}
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-canvas pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0"
      >
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
      </body>
    </html>
  );
}
