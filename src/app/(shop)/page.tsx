import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { CategoryRail } from "@/components/home/category-rail";
import { TrustBar } from "@/components/home/trust-bar";
import { ProductRail } from "@/components/home/product-rail";
import { ProductGrid } from "@/components/home/product-grid";
import { PromoTiles } from "@/components/home/promo-tiles";
import { DeliveryNote } from "@/components/home/delivery-note";
// import { Newsletter } from "@/components/home/newsletter";
import { getBestSellers, getNewArrivals, getOnOffer } from "@/lib/catalog";
import { siteUrl } from "@/data/site";
import { getSiteSettings } from "@/lib/settings";

import { jsonLd } from "@/lib/json-ld";

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
 *
 * The three rails are fetched together rather than section by section: they
 * read the same cached product list, so awaiting them in parallel costs one
 * round trip instead of three.
 */
export default async function HomePage() {
  const [bestSellers, onOffer, newArrivals] = await Promise.all([
    getBestSellers(),
    getOnOffer(),
    getNewArrivals(),
  ]);

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
      {/* <Newsletter /> */}

      <StoreJsonLd />
    </>
  );
}

/**
 * Structured data. `OnlineStore` plus the shipping/return terms Google surfaces
 * directly in Shopping results — the same COD facts the UI leads with.
 */
async function StoreJsonLd() {
  const site = await getSiteSettings();
  const { delivery } = site;

  const json = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: site.legalName,
    url: siteUrl,
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
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    /*
      No `hasMerchantReturnPolicy`, deliberately.

      There used to be one here declaring a seven-day, free, return-by-mail
      policy. The shop has none of those things. Unlike the wording on a page,
      this was a machine-readable claim to Google — the sort that is shown in
      Shopping results and that a merchant is held to. Absent is correct, and
      is what an omitted property means: nothing is claimed.

      If a real policy is ever introduced, it goes back here *and* on the
      returns page, and the two have to say the same thing.
    */
  };

  return (
    <script
      type="application/ld+json"
      // Escaped so an editable name cannot end the script element. See
      // `json-ld.ts` — this was a real stored XSS, not a theoretical one.
      dangerouslySetInnerHTML={jsonLd(json)}
    />
  );
}
