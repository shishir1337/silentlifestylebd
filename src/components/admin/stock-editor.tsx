"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { inputClass } from "@/components/ui/field";
import { updateVariantStock } from "@/lib/admin/catalog-actions";
import { cn } from "@/lib/cn";

/**
 * Correcting stock where it is noticed.
 *
 * "New stock arrived" is the most common reason to touch a product, and it is
 * the one job that does not need the editor: no price, no description, no
 * photos — just numbers against sizes. Sending somebody to a full form for it
 * is how a two-minute weekly task becomes one nobody does, and stale stock on
 * a storefront sells things the shop does not have.
 *
 * Opens in place under the row, saves the sizes that changed, and closes.
 */
export function StockEditor({
  productId,
  productName,
  variants,
  onClose,
}: {
  productId: string;
  productName: string;
  variants: { id: string; size: string; stock: number }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [levels, setLevels] = useState(() =>
    Object.fromEntries(variants.map((v) => [v.id, String(v.stock)])),
  );

  const changed = variants.filter((v) => Number(levels[v.id]) !== v.stock);

  function save() {
    if (changed.length === 0) {
      onClose();
      return;
    }
    startTransition(async () => {
      const result = await updateVariantStock(
        productId,
        changed.map((v) => ({ id: v.id, stock: Number(levels[v.id]) || 0 })),
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        `Stock updated for ${productName}${changed.length > 1 ? ` (${changed.length} sizes)` : ""}.`,
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-ink bg-canvas p-3">
      <div className="flex flex-wrap items-end gap-3">
        {variants.map((v) => (
          <div key={v.id} className="w-[84px]">
            <label
              htmlFor={`stk-${v.id}`}
              className="block text-[11px] font-medium text-ink-muted"
            >
              {v.size || "One size"}
            </label>
            <input
              id={`stk-${v.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={levels[v.id]}
              onChange={(e) => setLevels({ ...levels, [v.id]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
                if (e.key === "Escape") onClose();
              }}
              className={cn(
                inputClass(),
                "tabular mt-1 h-9 px-2 text-center text-[13px]",
                Number(levels[v.id]) !== v.stock && "border-brand",
              )}
            />
          </div>
        ))}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-ink px-3 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : changed.length > 0 ? `Save ${changed.length}` : "Done"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11.5px] text-ink-muted">
        Enter saves, Escape closes. Stock also goes down on its own as orders
        come in.
      </p>
    </div>
  );
}
