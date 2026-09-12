import { bdtParts } from "@/lib/currency";
import { cn } from "@/lib/cn";

/**
 * Renders a BDT amount with the taka sign isolated in its own span, so the
 * Bengali glyph can be resolved against a font stack that actually has it
 * without dragging the Latin digits along with it.
 */
export function Taka({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const { symbol, value } = bdtParts(amount);
  return (
    <span className={cn("tabular whitespace-nowrap", className)}>
      <span className="taka">{symbol}</span>
      {value}
    </span>
  );
}
