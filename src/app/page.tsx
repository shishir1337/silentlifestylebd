import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { CategoryRail } from "@/components/home/category-rail";
import { TrustBar } from "@/components/home/trust-bar";
import { ProductRail } from "@/components/home/product-rail";
import { ProductGrid } from "@/components/home/product-grid";
import { PromoTiles } from "@/components/home/promo-tiles";
import { DeliveryNote } from "@/components/home/delivery-note";
import { Newsletter } from "@/components/home/newsletter";
import { bestSellers, newArrivals, onOffer } from "@/data/products";
import { delivery, site } from "@/data/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Homepage.
 *
 * Section order follows shopper intent rather than visual variety:
 *   hero (what is this shop, one clear action)
 *   → categories (fastest route to intent — the top mobile tap target)
 *   → trust (COD objections answered before the first price is seen)
 *   → bestsellers (social proof through what others already bought)
 *   → collection tiles (splits the men's / Pakistani ladies audiences)
 *   → offers + new in (browsing fuel)
 *   → COD explainer (closes the hesitation at decision time)
 *   → SMS capture (last, so it never blocks shopping)
 *
 * Every section is a Server Component. The only client JS on this route is the
 * mobile menu, the tab bar's active state, and the SMS form.
 */
export default function HomePage() {
  return (
    <>
      {/*
        The hero is pure artwork now, so the page would otherwise ship without
        an <h1>. This one is for screen readers and search engines; the banner
        carries the same message visually, in its own pixels.
      */}
      <h1 className="sr-only">
        Silent Lifestyle — men&apos;s and women&apos;s fashion in Bangladesh,
        with cash on delivery nationwide
      </h1>

      <Hero />
      <CategoryRail />
      <TrustBar />

      <ProductRail
        id="bestsellers"
        title="Bestsellers this month"
        subtitle="What customers across Bangladesh are ordering most."
        href="/collections/bestsellers"
        products={bestSellers}
        priority
      />

      <PromoTiles />

      <ProductGrid
        id="offers"
        title="On offer now"
        subtitle="Genuine markdowns — no inflated was-prices."
        href="/collections/offers"
        products={onOffer}
        ctaLabel="See all offers"
      />

      <ProductRail
        id="new-in"
        title="New in"
        subtitle="Fresh stock, added every week."
        href="/collections/new"
        products={newArrivals}
      />

      <DeliveryNote />
      <Newsletter />

      <StoreJsonLd />
    </>
  );
}

/**
 * Structured data. `OnlineStore` plus the shipping/return terms Google surfaces
 * directly in Shopping results — the same COD facts the UI leads with.
 */
function StoreJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: site.legalName,
    url: site.url,
    description: site.description,
    telephone: site.phone,
    email: site.email,
    currenciesAccepted: "BDT",
    paymentAccepted: "Cash on Delivery, bKash, Nagad, Card",
    areaServed: { "@type": "Country", name: "Bangladesh" },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address,
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "BD",
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: delivery.returnWindowDays,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
  };

  return (
    <script
      type="application/ld+json"
      // Static, author-controlled object — no user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
