import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/data/site";
import { getSiteSettings } from "@/lib/settings";

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

/**
 * Titles and descriptions come from the settings the client edits.
 *
 * `metadataBase` does not. The canonical origin is where the site is deployed,
 * not a preference — pointing it somewhere else would silently rewrite every
 * canonical URL and every Open Graph image on the shop.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();

  return {
    metadataBase: new URL(siteUrl),
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
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — Fashion & Accessories in Bangladesh`,
      description: site.description,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays enabled — capping it is an accessibility failure.
  themeColor: "#ffffff",
  colorScheme: "light",
};

/**
 * The document itself, and nothing else.
 *
 * Deliberately bare: it holds the `<html>` element, the fonts and the
 * site-wide metadata, because those are the only things every route genuinely
 * shares. The storefront's chrome lives in `(shop)/layout.tsx` and the admin's
 * in `admin/layout.tsx`, so neither one can leak into the other.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-BD"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      {/*
        Browser extensions routinely stamp attributes onto <body> before React
        hydrates — ColorZilla adds `cz-shortcut-listen`, password managers and
        grammar checkers do the same — and each one surfaces as a hydration
        mismatch the app cannot fix. `suppressHydrationWarning` applies only to
        this element's own attributes and text, one level deep, so genuine
        mismatches anywhere inside the tree are still reported.
      */}
      <body suppressHydrationWarning className="min-h-full bg-canvas">
        {children}
      </body>
    </html>
  );
}
