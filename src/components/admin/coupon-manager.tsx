"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Taka } from "@/components/ui/price";
import { Card, EmptyState, Pill } from "./admin-ui";
import { useToast } from "./toast";
import { saveCoupon, setCouponActive, deleteCoupon } from "@/lib/admin/coupon-actions";
import { BLANK_COUPON, type CouponInput } from "@/lib/admin/coupon-types";
import type { AdminCoupon } from "@/lib/admin/coupon-admin";
import { cn } from "@/lib/cn";

/**
 * Discount codes.
 *
 * The list answers the question a shop actually asks about a code, which is
 * never "does it exist" but "was it worth it": how many orders carried it,
 * what they were worth, and what it gave away. A code with four hundred uses
 * and no revenue behind it has been posted somewhere it should not have been.
 *
 * The form shows the rules in the shape they will be read — "20% off, up to
 * ৳500, on orders over ৳2,000" is one sentence at the top of the form, built
 * from the fields as they are typed, because a coupon is a promise to a
 * customer and the person writing it should see the promise.
 */

const KINDS: { value: CouponInput["kind"]; label: string; hint: string }[] = [
  { value: "PERCENT", label: "Percentage off", hint: "e.g. 20% off the goods" },
  { value: "FIXED", label: "Amount off", hint: "e.g. ৳300 off the goods" },
  { value: "FREE_DELIVERY", label: "Free delivery", hint: "Waives the delivery charge" },
];

export function CouponManager({ coupons }: { coupons: AdminCoupon[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [editing, setEditing] = useState<CouponInput | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  function run(work: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setFailure(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setFailure(result.message ?? "That did not work.");
        setConfirming(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setEditing(null);
      setConfirming(null);
      toast.success(done);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {failure ? (
        <p
          role="alert"
          className="max-w-2xl rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[14px] leading-relaxed text-sale"
        >
          {failure}
        </p>
      ) : null}

      {editing ? (
        <Editor
          value={editing}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(next) =>
            run(() => saveCoupon(next), next.id ? "Code saved." : `${next.code.toUpperCase()} created.`)
          }
        />
      ) : (
        <Button type="button" onClick={() => setEditing({ ...BLANK_COUPON })}>
          New code
        </Button>
      )}

      {coupons.length === 0 ? (
        <EmptyState
          title="No discount codes yet"
          body="A code is worth making for a campaign, a festival, or to win back a customer who did not come back. Every one of them is priced on the server when the order is placed."
        />
      ) : (
        <ul className="space-y-2">
          {coupons.map((c) => (
            <li key={c.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[15px] font-semibold tracking-wider">
                        {c.code}
                      </p>
                      {c.isActive ? <Pill tone="on">On</Pill> : <Pill tone="off">Off</Pill>}
                      {expiryNote(c) ? <Pill tone="warn">{expiryNote(c)}</Pill> : null}
                    </div>
                    <p className="mt-1 text-[13px] text-ink-soft">{rules(c)}</p>
                    <p className="mt-1.5 text-[12px] text-ink-muted">{limits(c)}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <p className="tabular text-[13px] font-semibold">
                      {c.ordersPlaced} {c.ordersPlaced === 1 ? "order" : "orders"}
                    </p>
                    {c.ordersPlaced > 0 ? (
                      <>
                        <p className="tabular text-[12px] text-ink-muted">
                          <Taka amount={c.revenue} /> taken
                        </p>
                        {c.given > 0 ? (
                          <p className="tabular text-[12px] text-sale">
                            <Taka amount={c.given} /> given
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => setCouponActive(c.id, !c.isActive),
                          c.isActive ? `${c.code} switched off.` : `${c.code} switched on.`,
                        )
                      }
                      className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium hover:border-ink disabled:opacity-50"
                    >
                      {c.isActive ? "Switch off" : "Switch on"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: c.id,
                          code: c.code,
                          kind: c.kind,
                          value: c.value,
                          minSpend: c.minSpend,
                          maxDiscount: c.maxDiscount,
                          usageLimit: c.usageLimit,
                          perPhoneLimit: c.perPhoneLimit,
                          startsAt: c.startsAt?.slice(0, 10) ?? "",
                          endsAt: c.endsAt?.slice(0, 10) ?? "",
                          isActive: c.isActive,
                        })
                      }
                      className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium hover:border-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(c.id)}
                      className="inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2 text-[12.5px] font-medium text-ink-muted hover:text-sale"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {confirming === c.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 p-2.5">
                    <span className="text-[13px]">
                      Delete {c.code} for good? Switching it off stops it working just
                      as fast and keeps the history.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => deleteCoupon(c.id), `${c.code} deleted.`)}
                    >
                      Delete
                    </Button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium"
                    >
                      Keep it
                    </button>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --- how a code reads ----------------------------------------------------- */

const taka = (n: number) => `৳${n.toLocaleString("en-US")}`;

function rules(c: Pick<AdminCoupon, "kind" | "value" | "minSpend" | "maxDiscount">): string {
  const what =
    c.kind === "FREE_DELIVERY"
      ? "Free delivery"
      : c.kind === "PERCENT"
        ? `${c.value}% off`
        : `${taka(c.value)} off`;
  const cap = c.kind === "PERCENT" && c.maxDiscount > 0 ? `, up to ${taka(c.maxDiscount)}` : "";
  const min = c.minSpend > 0 ? `, on orders over ${taka(c.minSpend)}` : "";
  return `${what}${cap}${min}`;
}

function limits(c: Pick<AdminCoupon, "usageLimit" | "usageCount" | "perPhoneLimit">): string {
  const total =
    c.usageLimit > 0 ? `${c.usageCount} of ${c.usageLimit} used` : `${c.usageCount} used`;
  const perPhone =
    c.perPhoneLimit === 0
      ? "no limit per number"
      : c.perPhoneLimit === 1
        ? "once per phone number"
        : `${c.perPhoneLimit} times per phone number`;
  return `${total} · ${perPhone}`;
}

function expiryNote(c: Pick<AdminCoupon, "startsAt" | "endsAt">): string | null {
  const now = Date.now();
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return "Not started";
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return "Expired";
  return null;
}

/* --- the form ------------------------------------------------------------- */

function Editor({
  value,
  pending,
  onSave,
  onCancel,
}: {
  value: CouponInput;
  pending: boolean;
  onSave: (v: CouponInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(value);
  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const num = (v: string) => Math.max(0, Number.parseInt(v, 10) || 0);

  return (
    <Card className="max-w-2xl p-5">
      <h2 className="text-[15px] font-semibold">
        {value.id ? `Edit ${value.code}` : "New discount code"}
      </h2>

      {/* The promise, as the customer will read it, built as it is typed. */}
      <p className="mt-2 rounded-[var(--radius-sm)] bg-brand-tint px-3.5 py-2.5 text-[13px] font-medium text-brand">
        {form.code.trim() ? form.code.trim().toUpperCase() : "YOURCODE"} — {rules(form)}
      </p>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Code"
            id="c-code"
            required
            hint="What the customer types. Letters, numbers and dashes."
          >
            <input
              id="c-code"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="EID20"
              autoComplete="off"
              className={cn(inputClass(), "font-mono tracking-wider")}
            />
          </Field>

          <Field label="What it does" id="c-kind" required>
            <select
              id="c-kind"
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as CouponInput["kind"])}
              className={inputClass()}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {form.kind !== "FREE_DELIVERY" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={form.kind === "PERCENT" ? "Percentage off" : "Amount off (৳)"}
              id="c-value"
              required
            >
              <input
                id="c-value"
                type="number"
                inputMode="numeric"
                min={1}
                max={form.kind === "PERCENT" ? 100 : undefined}
                value={form.value}
                onChange={(e) => set("value", num(e.target.value))}
                className={cn(inputClass(), "tabular")}
              />
            </Field>

            {form.kind === "PERCENT" ? (
              <Field
                label="Most it can take off (৳)"
                id="c-cap"
                hint="Leave at 0 for no cap. Stops 20% off becoming ৳4,000 on a large order."
              >
                <input
                  id="c-cap"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.maxDiscount}
                  onChange={(e) => set("maxDiscount", num(e.target.value))}
                  className={cn(inputClass(), "tabular")}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        <Field
          label="Minimum order (৳)"
          id="c-min"
          hint="The goods total before delivery. 0 for no minimum."
        >
          <input
            id="c-min"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.minSpend}
            onChange={(e) => set("minSpend", num(e.target.value))}
            className={cn(inputClass(), "tabular max-w-[200px]")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Total uses"
            id="c-limit"
            hint="0 for unlimited. The last one cannot be spent twice."
          >
            <input
              id="c-limit"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.usageLimit}
              onChange={(e) => set("usageLimit", num(e.target.value))}
              className={cn(inputClass(), "tabular")}
            />
          </Field>

          <Field
            label="Uses per phone number"
            id="c-per"
            hint="Counted by phone, not account — most orders here are guests."
          >
            <input
              id="c-per"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.perPhoneLimit}
              onChange={(e) => set("perPhoneLimit", num(e.target.value))}
              className={cn(inputClass(), "tabular")}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" id="c-from" hint="Leave empty to start now.">
            <input
              id="c-from"
              type="date"
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
              className={inputClass()}
            />
          </Field>
          <Field label="Ends" id="c-to" hint="Leave empty for no end date.">
            <input
              id="c-to"
              type="date"
              value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
              className={inputClass()}
            />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 text-[14px]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
          />
          <span>
            Working now
            <span className="mt-0.5 block text-[12px] text-ink-muted">
              Switch it off to stop it at once, without deleting it.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : value.id ? "Save changes" : "Create code"}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[14px] font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
