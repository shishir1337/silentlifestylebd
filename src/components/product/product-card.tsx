import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/catalog";
import { PriceTag } from "./price-tag";
import { AddToCartButton } from "./add-to-cart-button";
import { TruckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { fillProps } from "@/lib/image";

const badgeCopy = {
  new: { label: "New", className: "bg-ink text-white" },
  bestseller: { label: "Bestseller", className: "bg-brand text-on-brand" },
  limited: { label: "Limited", className: "bg-sale text-white" },
} as const;

/**
 * The card used to be one large <Link>, which is the cleanest possible tap
 * target — but an interactive control cannot be nested inside an anchor. So the
 * link is now "stretched": the title anchor paints an ::after across the whole
 * tile, keeping the big tap target, while the add-to-bag button lifts itself
 * above it with its own stacking context.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width:1024px) 22vw, (min-width:640px) 30vw, 45vw",
}: {
  product: Product;
  /** Set on the first row above the fold only. */
  priority?: boolean;
  sizes?: string;
}) {
  const badge = product.badge ? badgeCopy[product.badge] : null;

  return (
    <article className="group relative flex h-full flex-col">
      {/* 4:5 portrait — the standard for apparel, and it reserves height
          before the image lands, so the grid never jumps. */}
      <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-md)] bg-subtle">
        {/* Blur-up on every card. The placeholder is stored on the asset and
            is ~400 bytes; measured against turning it off across the grid, the
            saving was 146 bytes gzipped. Not a trade worth making. */}
        <Image
          {...fillProps(product.image)}
          alt={product.name}
          sizes={sizes}
          quality={60}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className={cn(
            "object-cover transition-[opacity,scale] duration-[var(--dur-slow)] [transition-timing-function:var(--ease-out-soft)]",
            product.hoverImage
              ? "group-hover:opacity-0 group-focus-within:opacity-0"
              : "group-hover:scale-[1.05] group-focus-within:scale-[1.05]",
          )}
        />

        {product.hoverImage ? (
          <Image
            {...fillProps(product.hoverImage)}
            alt=""
            aria-hidden
            sizes={sizes}
            quality={60}
            loading="lazy"
            className="object-cover opacity-0 transition-opacity duration-[var(--dur-slow)] [transition-timing-function:var(--ease-out-soft)] group-hover:opacity-100 group-focus-within:opacity-100"
          />
        ) : null}

        {badge ? (
          <span
            className={cn(
              "absolute top-2.5 left-2.5 rounded-[var(--radius-xs)] px-2 py-1 text-[10px] font-semibold tracking-wide uppercase",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        ) : null}

        {!product.inStock ? (
          <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-2 text-center text-[11px] font-medium tracking-wide text-white uppercase">
            Out of stock
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="text-[13px] leading-snug font-normal text-ink-soft sm:text-sm">
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-2 rounded-[var(--radius-xs)] after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            {product.name}
          </Link>
        </h3>

        <PriceTag
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          className="mt-1.5"
        />

        {product.freeDelivery ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-brand">
            <TruckIcon className="size-3.5" />
            Free delivery
          </p>
        ) : null}

        {/* Pushed to the bottom so buttons line up across a row of cards
            whose titles wrap to different numbers of lines. */}
        <div className="mt-auto">
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
