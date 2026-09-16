import { ImageResponse } from "next/og";
import { freeDeliveryOffered } from "@/lib/orders";
import { getProduct, allProductSlugs } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/settings";

/**
 * The card a shared product link shows.
 *
 * This is the one that matters. A product link pasted into WhatsApp is how
 * most of this shop's traffic will arrive, and the card is the whole shop
 * front in that moment: the garment, what it costs, and that nothing is paid
 * up front.
 *
 * The photograph is fetched from the image service at a size worth sending
 * rather than the full-resolution original — the card is 1200px wide and half
 * of it is type.
 *
 * Generated for every product at build time, from the same slugs the pages
 * use, so a share is instant rather than rendering an image on first request.
 */
export const alt = "Product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return (await allProductSlugs()).map((slug) => ({ slug }));
}

const taka = (n: number) => `Tk ${n.toLocaleString("en-US")}`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, site] = await Promise.all([getProduct(slug), getSiteSettings()]);

  // A card for a product that has gone is better than a broken image.
  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#faf9f7",
            fontSize: 56,
            color: "#1a1917",
          }}
        >
          {site.name}
        </div>
      ),
      size,
    );
  }

  const price = taka(product.price);
  const was = product.compareAtPrice ? taka(product.compareAtPrice) : null;
  const promise = product.freeDelivery
    ? "Free delivery · Cash on delivery"
    : freeDeliveryOffered(site.delivery)
      ? `Cash on delivery · Free over ${taka(site.delivery.freeThreshold)}`
      : "Cash on delivery";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: "#faf9f7" }}>
        <div style={{ display: "flex", width: 520, height: "100%" }}>
          {/*
            A raw <img>, and it has to be. This renders inside `ImageResponse`,
            which is Satori rather than a browser — it understands a small
            subset of HTML and knows nothing about `next/image`.

            The suppression is a `biome-ignore` because this project lints with
            Biome; the `eslint-disable` that used to sit here matched no linter
            that runs and had been quietly doing nothing.
          */}
          {/* biome-ignore lint/performance/noImgElement: ImageResponse renders through Satori, which has no next/image. */}
          <img
            src={`${product.image.url}?tr=w-520,h-630,fo-auto,q-70`}
            alt=""
            width={520}
            height={630}
            style={{ width: 520, height: 630, objectFit: "cover" }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#0b6e4f",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              SL
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#55524c" }}>
              {site.name}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 48,
                fontWeight: 700,
                color: "#1a1917",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              {product.name}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: "#0b6e4f" }}>
                {price}
              </div>
              {was ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    color: "#6b6862",
                    textDecoration: "line-through",
                  }}
                >
                  {was}
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              backgroundColor: "#e9f3ef",
              color: "#0b6e4f",
              padding: "12px 24px",
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 600,
              alignSelf: "flex-start",
            }}
          >
            {promise}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
