import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductRail } from "@/components/home/product-rail";
import {
  CashIcon,
  ChevronRightIcon,
  ReturnIcon,
  ShieldIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { Taka } from "@/components/ui/price";
import { allProductSlugs, getCategory, getGallery, getProduct, getRelated } from "@/lib/catalog";
import { delivery, site } from "@/data/site";
import { formatBDT } from "@/lib/currency";

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
      images: [{ url: product.image.url }],
    },
  };
}

const badgeCopy = {
  new: { label: "New", className: "bg-ink text-white" },
  bestseller: { label: "Bestseller", className: "bg-brand text-on-brand" },
  limited: { label: "Limited", className: "bg-sale text-white" },
} as const;

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [category, related] = await Promise.all([
    getCategory(product.categorySlug),
    getRelated(product),
  ]);
  const gallery = getGallery(product);

  return (
    <>
      {/* The sticky mobile buy bar overlaps the page bottom; reserve for it. */}
      <div className="pb-20 lg:pb-0">
        <Container>
          <Breadcrumbs
            trail={[
              { label: "Home", href: "/" },
              ...(category
                ? [{ label: category.name, href: `/collections/${category.slug}` }]
                : []),
              { label: product.name },
            ]}
          />

          <div className="grid gap-8 pb-10 lg:grid-cols-2 lg:gap-12">
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

              <p className="mt-2 text-[13px] text-ink-muted">
                SKU <span className="tabular">{product.sku}</span>
              </p>

              <ProductPurchase product={product} />

              <TrustPanel freeDelivery={product.freeDelivery} />

              <div className="mt-8 border-t border-line pt-6">
                <h2 className="text-[15px] font-semibold">Description</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  {product.description}
                </p>

                <h3 className="mt-5 text-[15px] font-semibold">Details</h3>
                <ul className="mt-2 space-y-1.5">
                  {product.details.map((d) => (
                    <li
                      key={d}
                      className="flex gap-2 text-[14px] leading-relaxed text-ink-soft"
                    >
                      <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-line-strong" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>

        <ProductRail
          id="related"
          title="You may also like"
          subtitle={category ? `More from ${category.name.toLowerCase()}` : undefined}
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
    </>
  );
}

function Breadcrumbs({
  trail,
}: {
  trail: { label: string; href?: string }[];
}) {
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
              <span aria-current="page" className="inline-flex min-h-6 items-center line-clamp-1 text-ink-soft">
                {crumb.label}
              </span>
            )}
            {i < trail.length - 1 ? (
              <ChevronRightIcon aria-hidden className="size-3.5 text-line-strong" />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The COD reassurance block, repeated here because this is where the decision
 * actually gets made — a shopper who read the homepage ten minutes ago should
 * not have to go back for the delivery charge.
 */
function TrustPanel({ freeDelivery }: { freeDelivery?: boolean }) {
  const rows = [
    {
      Icon: CashIcon,
      title: "Cash on Delivery",
      body: "Pay the delivery man when the parcel reaches you.",
    },
    {
      Icon: TruckIcon,
      title: freeDelivery ? "Free delivery on this item" : "Delivery charge",
      body: freeDelivery ? (
        <>Anywhere in Bangladesh, {delivery.insideDhakaDays} inside Dhaka.</>
      ) : (
        <>
          <Taka amount={delivery.insideDhaka} /> inside Dhaka ·{" "}
          <Taka amount={delivery.outsideDhaka} /> outside. Free over{" "}
          <Taka amount={delivery.freeThreshold} />.
        </>
      ),
    },
    {
      Icon: ReturnIcon,
      title: `${delivery.returnWindowDays}-day easy return`,
      body: "Unused and with tags on, we take it back.",
    },
    {
      Icon: ShieldIcon,
      title: "100% authentic",
      body: "Checked before dispatch. No copy products.",
    },
  ];

  return (
    <ul className="mt-7 space-y-3 rounded-[var(--radius-md)] border border-line bg-subtle p-4">
      {rows.map(({ Icon, title, body }) => (
        <li key={title} className="flex gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold">{title}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProductJsonLd({
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
  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    sku,
    image: [`${site.url}${image}`],
    brand: { "@type": "Brand", name: site.legalName },
    offers: {
      "@type": "Offer",
      url: `${site.url}/products/${slug}`,
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
      // Static, author-controlled object — no user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
