import type { Metadata } from "next";
import { freeDeliveryOffered } from "@/lib/orders";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import {
  ProductTabs,
  SizeGuideProvider,
  SIZE_CHART_TAB,
} from "@/components/product/product-tabs";
import { SizeChartTable } from "@/components/product/size-chart-table";
import { TrackProductView } from "@/components/product/track-product-view";
import { ProductRail } from "@/components/home/product-rail";
import {
  CashIcon,
  ChevronRightIcon,
  ReturnIcon,

  TruckIcon,
} from "@/components/ui/icons";
import { Taka } from "@/components/ui/price";
import { RichTextBody } from "@/components/content/rich-text";
import {
  allProductSlugs,
  getCategory,
  getGallery,
  getProduct,
  getRelated,
  getSizeChartForCategory,
} from "@/lib/catalog";
import { siteUrl } from "@/data/site";
import { getSiteSettings } from "@/lib/settings";
import { formatBDT } from "@/lib/currency";
import { jsonLd } from "@/lib/json-ld";

/**
 * Product detail.
 *
 * Every product is known at build time, so the whole catalogue prerenders as
 * static HTML — a product page is the single most performance-sensitive route
 * in a store, and there is nothing here that needs a server round trip.
 */
export async function generateStaticParams() {
  return (await allProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — ${formatBDT(product.price)}`,
      description: product.description,
      /*
        No `images` here on purpose. Setting it overrides the generated card in
        `opengraph-image.tsx`, which is this photograph *plus* the name, the
        price and "cash on delivery" — the three things that decide whether a
        link pasted into WhatsApp becomes an order.
      */
    },
  };
}

const badgeCopy = {
  new: { label: "New", className: "bg-ink text-white" },
  bestseller: { label: "Bestseller", className: "bg-brand text-on-brand" },
  limited: { label: "Limited", className: "bg-sale text-white" },
} as const;

export default async function ProductPage(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [category, related, sizeChart] = await Promise.all([
    getCategory(product.categorySlug),
    /*
      Four, not eight.

      Every tile down here is a way to leave the page the visitor was paid to
      land on. A shopper who is browsing gains from a long rail; a shopper who
      arrived from an advertisement for *this* shirt gains a longer list of
      reasons to stop thinking about it. Four is enough to rescue somebody who
      genuinely does not want this one.
    */
    getRelated(product, 4),
    /*
      The one chart this product is measured by, not all of them.
      Null for the categories sold in a single size — see the column comment
      on `Category.sizeChartId`.
    */
    getSizeChartForCategory(product.categorySlug),
  ]);
  const gallery = getGallery(product);

  return (
    <>
      {/* The sticky mobile buy bar overlaps the page bottom; reserve for it. */}
      <div className="pb-20 lg:pb-0">
        <Container>
          {/*
            A trail on desktop, one step back on a phone.

            Most arrivals here come straight from an advertisement, so there is
            no trail behind them to retrace — "Home › Formal Shirt › Slim Fit
            Formal Shirt — Sky Blue" wrapped to two lines, repeated the name
            that is about to appear as the heading, and pushed the product
            itself further down a screen that had none to spare. One link back
            into the category does the only job that was left.
          */}
          <div className="lg:hidden">
            {category ? (
              <Link
                href={`/collections/${category.slug}`}
                className="-my-2 -ml-1 inline-flex min-h-11 items-center gap-1 py-2 text-[13px] text-ink-soft transition-colors duration-[var(--dur-base)] hover:text-ink"
              >
                <ChevronRightIcon aria-hidden className="size-4 rotate-180" />
                {category.name}
              </Link>
            ) : (
              <div className="h-4" />
            )}
          </div>

          <div className="hidden lg:block">
            <Breadcrumbs
              trail={[
                { label: "Home", href: "/" },
                ...(category
                  ? [
                      {
                        label: category.name,
                        href: `/collections/${category.slug}`,
                      },
                    ]
                  : []),
                { label: product.name },
              ]}
            />
          </div>

          {/*
            The provider wraps both halves because the size-guide button lives
            in the right column and the tab it opens lives below both. Server
            children pass straight through it.
          */}
          <SizeGuideProvider>
            {/* A zero minimum, not the implicit `auto` track. `auto` is
                `minmax(min-content, max-content)`, so the 379px tab scroller
                below held this column at 347px and the page scrolled sideways
                on a 320px phone. `lg:grid-cols-2` already resolves to
                `minmax(0,1fr)`, which is why only the phone layout was hit. */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pb-10 lg:grid-cols-2 lg:gap-12">
              <ProductGallery
                images={gallery}
                alt={product.name}
                badge={product.badge ? badgeCopy[product.badge] : null}
                soldOut={!product.inStock}
              />

              <div className="lg:pt-2">
                {category ? (
                  <p className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
                    {category.name}
                  </p>
                ) : null}

                <h1 className="mt-1.5 text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
                  {product.name}
                </h1>

                {/*
                The three objections, answered before the buttons rather than
                after them.

                The full panel below says all of this properly and stays where
                it is — but it sat under both CTAs, which meant a shopper
                deciding whether to trust a shop they reached from an
                advertisement had to scroll *past* the decision to find the
                reassurance. In a cash-on-delivery market "you pay when it
                arrives" is not a detail; it is the offer.

                Directly under the name. One line lower — under the SKU, where
                it started — and it fell behind the sticky buy bar on a 390px
                screen, which is the same as not being there at all.
              */}
                <ReassuranceLine freeDelivery={product.freeDelivery} />

                <ProductPurchase product={product} />

                {/*
                The SKU is for the telephone call that confirms the order, not
                for the decision to place it. It was sitting between the name
                and the price — the most valuable few pixels on the page.
              */}
                <p className="mt-5 text-[12.5px] text-ink-muted">
                  SKU <span className="tabular">{product.sku}</span>
                </p>

                {/*
                Description, size chart, delivery — one at a time.

                These were three stacked blocks, and two of them said the same
                thing: the promises line under the name and a panel repeating
                them nine hundred pixels lower. The panel is now the delivery
                tab, which is where somebody goes when they want the actual
                charges rather than the promise.

                The size chart is the reason this is tabs at all. It has to
                live on this page — see the button beside the size selector.
              */}
                <ProductTabs
                  tabs={[
                    {
                      id: "description",
                      label: "Description",
                      content: (
                        <>
                          <RichTextBody
                            value={product.descriptionRich}
                            fallback={product.description}
                            className="text-[14px] leading-relaxed text-ink-soft"
                          />

                          {product.details.length > 0 ? (
                            <>
                              <h3 className="mt-5 text-[15px] font-semibold">
                                Details
                              </h3>
                              <ul className="mt-2 space-y-1.5">
                                {product.details.map((d) => (
                                  <li
                                    key={d}
                                    className="flex gap-2 text-[14px] leading-relaxed text-ink-soft"
                                  >
                                    <span
                                      aria-hidden
                                      className="mt-[7px] size-1 shrink-0 rounded-full bg-line-strong"
                                    />
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                        </>
                      ),
                    },
                    // Only when the category has one. See `getSizeChartForCategory`.
                    ...(sizeChart
                      ? [
                          {
                            id: SIZE_CHART_TAB,
                            label: "Size chart",
                            content: <SizeChartTable chart={sizeChart} />,
                          },
                        ]
                      : []),
                    {
                      id: "delivery",
                      label: "Shipping & returns",
                      content: (
                        <TrustPanel freeDelivery={product.freeDelivery} />
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </SizeGuideProvider>
        </Container>

        <ProductRail
          id="related"
          title="You may also like"
          subtitle={
            category ? `More from ${category.name.toLowerCase()}` : undefined
          }
          href={category ? `/collections/${category.slug}` : "/collections"}
          products={related}
        />
      </div>

      <ProductJsonLd
        name={product.name}
        description={product.description}
        sku={product.sku}
        image={product.image.url}
        price={product.price}
        inStock={product.inStock}
        slug={product.slug}
      />

      {/* The one event nearly all of this shop's ad spend is optimised
          against — the advertisement lands here, not on the homepage. */}
      <TrackProductView
        sku={product.sku}
        name={product.name}
        category={product.categorySlug}
        price={product.price}
      />
    </>
  );
}

function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-ink-muted">
        {trail.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-1">
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] transition-colors duration-[var(--dur-base)] hover:text-ink"
              >
                {crumb.label}
              </Link>
            ) : (
              // The current page is not a link, and is marked as the endpoint.
              <span
                aria-current="page"
                className="inline-flex min-h-6 items-center line-clamp-1 text-ink-soft"
              >
                {crumb.label}
              </span>
            )}
            {i < trail.length - 1 ? (
              <ChevronRightIcon
                aria-hidden
                className="size-3.5 text-line-strong"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The same three promises as the panel below, in one line above the buttons.
 *
 * Not a duplicate for emphasis — a different job. The panel explains; this
 * one is there at the moment of the decision, for somebody who will not scroll
 * to be reassured. So it is the shortest true version of each: what they pay
 * with, when it arrives, and what happens if it is wrong.
 *
 * Delivery days come from Settings, so the client can change what this
 * promises without a developer, and the promise on the product page cannot
 * drift from the one at checkout.
 */
async function ReassuranceLine({ freeDelivery }: { freeDelivery?: boolean }) {
  const { delivery } = await getSiteSettings();

  const promises = [
    { Icon: CashIcon, text: "Cash on delivery" },
    {
      Icon: TruckIcon,
      /*
        "Dhaka 1–2 days", not "1–2 days in Dhaka".

        Three characters shorter, which is the difference between one line and
        two on a 360px Android — and the qualifier has to stay either way.
        Outside Dhaka is 2–4 days, so a bare "1–2 days" would be a promise this
        shop cannot keep for most of the country.
      */
      text: freeDelivery
        ? "Free delivery"
        : `Dhaka ${delivery.insideDhakaDays}`,
    },
    { Icon: ReturnIcon, text: `${delivery.returnWindowDays}-day return` },
  ];

  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-1 text-[12.5px] text-ink-soft">
      {promises.map(({ Icon, text }, i) => (
        <li key={text} className="flex items-center gap-1.5">
          {/*
            One icon, on the promise that carries the offer.

            Three icons and three labels came to 370px of content on a 358px
            screen, so the line wrapped and the third promise landed under the
            sticky buy bar — clipped, which is worse than absent because it
            looks broken. The icons were 80px of that. A middot between the
            other two reads as one continuous sentence and costs four pixels.

            The full panel lower down keeps an icon on every row; it has the
            width for them.
          */}
          {i === 0 ? (
            <Icon aria-hidden className="size-4 shrink-0 text-brand" />
          ) : null}
          {text}
          {i < promises.length - 1 ? (
            <span aria-hidden className="ml-1 text-line-strong">
              ·
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * The specifics, for the shopper who wants them.
 *
 * Not the promises again. Those are the line under the product name, and this
 * used to be the same four headlines a second time with icons on them — "Cash
 * on Delivery", "7-day easy return" — which is why it read as repetition. The
 * line makes the promise; this answers the questions the promise raises, in
 * the words somebody would ask them.
 *
 * Every figure comes from Settings, so it is the same number the checkout will
 * charge, and the client can change it without a developer.
 */
async function TrustPanel({ freeDelivery }: { freeDelivery?: boolean }) {
  const { delivery } = await getSiteSettings();

  const answers: { q: string; a: ReactNode }[] = [
    {
      q: "What does delivery cost?",
      a: freeDelivery ? (
        <>Nothing on this item — delivery is free anywhere in Bangladesh.</>
      ) : (
        <>
          <Taka amount={delivery.insideDhaka} /> inside Dhaka,{" "}
          <Taka amount={delivery.outsideDhaka} /> anywhere else
          {freeDeliveryOffered(delivery) ? (
            <>
              , and free on any order over{" "}
              <Taka amount={delivery.freeThreshold} />
            </>
          ) : null}
          .
        </>
      ),
    },
    {
      q: "How long will it take?",
      a: (
        <>
          {delivery.insideDhakaDays} inside Dhaka, {delivery.outsideDhakaDays}{" "}
          elsewhere in the country. We call to confirm before it is dispatched.
        </>
      ),
    },
    {
      q: "When do I pay?",
      a: (
        <>
          When it reaches you. Nothing is taken in advance and there is no
          online payment — count the notes at your door.
        </>
      ),
    },
    {
      q: "What if it does not fit?",
      a: (
        <>
          Send it back within {delivery.returnWindowDays} days, unused and with
          the tags on, and we will exchange it or refund it.
        </>
      ),
    },
    {
      q: "Is it genuine?",
      a: <>Checked by hand before dispatch. We do not sell copy products.</>,
    },
  ];

  return (
    <dl className="space-y-4">
      {answers.map(({ q, a }) => (
        <div key={q}>
          <dt className="text-[14px] font-semibold">{q}</dt>
          <dd className="mt-1 text-[14px] leading-relaxed text-ink-soft">{a}</dd>
        </div>
      ))}
    </dl>
  );
}

async function ProductJsonLd({
  name,
  description,
  sku,
  image,
  price,
  inStock,
  slug,
}: {
  name: string;
  description: string;
  sku: string;
  image: string;
  price: number;
  inStock: boolean;
  slug: string;
}) {
  const site = await getSiteSettings();

  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    sku,
    image: [`${siteUrl}${image}`],
    brand: { "@type": "Brand", name: site.legalName },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${slug}`,
      priceCurrency: "BDT",
      price,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: site.legalName },
    },
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
