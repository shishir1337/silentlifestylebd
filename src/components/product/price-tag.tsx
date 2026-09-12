import { discountPercent } from "@/lib/currency";
import { Taka } from "@/components/ui/price";
import { cn } from "@/lib/cn";

/**
 * Price block. Tabular figures keep the baseline steady across a grid, and the
 * struck-through comparison price is marked up as <s> so assistive tech reads
 * it as superseded rather than as a second price.
 */
export function PriceTag({
  price,
  compareAtPrice,
  size = "md",
  className,
}: {
  price: number;
  /** `null` when there is no markdown — the shape the database stores. */
  compareAtPrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const off = compareAtPrice ? discountPercent(price, compareAtPrice) : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <Taka
        amount={price}
        className={cn(
          "font-semibold text-ink",
          size === "sm" && "text-sm",
          size === "md" && "text-[15px] sm:text-base",
          size === "lg" && "text-xl sm:text-2xl",
        )}
      />

      {compareAtPrice && off > 0 ? (
        <>
          <s className="text-[13px] text-ink-muted decoration-ink-muted/50">
            <Taka amount={compareAtPrice} />
          </s>
          <span className="tabular text-[11px] font-semibold text-sale sm:text-xs">
            −{off}%
          </span>
        </>
      ) : null}
    </div>
  );
}
