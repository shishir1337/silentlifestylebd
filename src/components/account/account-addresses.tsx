"use client";

import { useState } from "react";
import { Taka } from "@/components/ui/price";
import { CheckIcon, PinIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { newAddressId, useAddresses, type Address } from "@/lib/account";
import { validateCheckout, type CheckoutErrors } from "@/lib/orders";
import { delivery } from "@/data/site";
import { cn } from "@/lib/cn";

const blank = (): Address => ({
  id: newAddressId(),
  label: "Home",
  recipient: "",
  phone: "",
  address: "",
  area: "inside-dhaka",
  isDefault: false,
});

/**
 * Address book.
 *
 * Reuses the checkout validator rather than carrying a second copy of the
 * phone rules — an address saved here is the same address checkout will use,
 * so the two must accept exactly the same input.
 */
export function AccountAddresses() {
  const { addresses, ready, upsert, remove, makeDefault } = useAddresses();
  const [draft, setDraft] = useState<Address | null>(null);
  const [errors, setErrors] = useState<CheckoutErrors>({});

  if (!ready) return <div className="py-20" aria-busy="true" />;

  function save() {
    if (!draft) return;
    const found = validateCheckout({
      name: draft.recipient,
      phone: draft.phone,
      address: draft.address,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    upsert({ ...draft, label: draft.label.trim() || "Address" });
    setDraft(null);
    setErrors({});
  }

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
            Addresses
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Saved addresses fill in your details at checkout.
          </p>
        </div>
        {!draft ? (
          <button
            type="button"
            onClick={() => {
              setDraft(blank());
              setErrors({});
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-sm)] bg-ink px-4 text-[14px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.98]"
          >
            <PlusIcon className="size-4" />
            Add address
          </button>
        ) : null}
      </div>

      {draft ? (
        <div className="mt-5 rounded-[var(--radius-md)] border-2 border-ink p-4">
          <h2 className="text-[15px] font-semibold">
            {addresses.some((a) => a.id === draft.id) ? "Edit address" : "New address"}
          </h2>

          <div className="mt-4 space-y-4">
            <Row label="Label" id="label" hint="Home, Office — whatever you call it.">
              <input
                id="label"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className={field(false)}
              />
            </Row>

            <Row label="Recipient name" id="recipient" error={errors.name}>
              <input
                id="recipient"
                autoComplete="name"
                value={draft.recipient}
                onChange={(e) => setDraft({ ...draft, recipient: e.target.value })}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "recipient-error" : undefined}
                className={field(Boolean(errors.name))}
              />
            </Row>

            <Row label="Mobile number" id="addr-phone" error={errors.phone}>
              <input
                id="addr-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="01712345678"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "addr-phone-error" : undefined}
                className={field(Boolean(errors.phone))}
              />
            </Row>

            <Row label="Full address" id="addr-line" error={errors.address}>
              <textarea
                id="addr-line"
                rows={3}
                autoComplete="street-address"
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                aria-invalid={errors.address ? true : undefined}
                aria-describedby={errors.address ? "addr-line-error" : undefined}
                className={cn(field(Boolean(errors.address)), "h-auto py-2.5")}
              />
            </Row>

            <fieldset>
              <legend className="text-[13px] font-medium">Delivery area</legend>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {(
                  [
                    ["inside-dhaka", "Inside Dhaka", delivery.insideDhaka],
                    ["outside-dhaka", "Outside Dhaka", delivery.outsideDhaka],
                  ] as const
                ).map(([value, title, charge]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border-2 p-3 text-[14px] transition-colors duration-[var(--dur-base)]",
                      draft.area === value ? "border-ink bg-subtle" : "border-line",
                    )}
                  >
                    <input
                      type="radio"
                      name="addr-area"
                      checked={draft.area === value}
                      onChange={() => setDraft({ ...draft, area: value })}
                      className="size-4 shrink-0 accent-[var(--color-ink)]"
                    />
                    <span>
                      {title}{" "}
                      <span className="text-ink-muted">
                        (<Taka amount={charge} />)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-2.5 text-[14px]">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
                className="size-4 accent-[var(--color-ink)]"
              />
              Use as my default address
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={save}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] bg-ink px-5 text-[14px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.98] sm:flex-1"
            >
              Save address
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setErrors({});
              }}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-5 text-[14px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink sm:flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {addresses.length === 0 && !draft ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-line-strong px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-ink-muted">
            <PinIcon className="size-6" />
          </span>
          <p className="text-[15px] font-medium">No saved addresses</p>
          <p className="max-w-sm text-[13px] text-ink-muted">
            Save one and checkout fills itself in next time.
          </p>
        </div>
      ) : null}

      {addresses.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-[var(--radius-md)] border p-4",
                a.isDefault ? "border-ink bg-subtle" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold">{a.label}</p>
                {a.isDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
                    <CheckIcon className="size-3" />
                    Default
                  </span>
                ) : null}
              </div>

              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                {a.recipient}
                <br />
                <span className="tabular">{a.phone}</span>
                <br />
                {a.address}
              </p>
              <p className="mt-1 text-[12px] text-ink-muted">
                {a.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(a);
                    setErrors({});
                  }}
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[12px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                >
                  Edit
                </button>
                {!a.isDefault ? (
                  <button
                    type="button"
                    onClick={() => makeDefault(a.id)}
                    className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[12px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                  >
                    Make default
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label={`Delete ${a.label} address`}
                  className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted transition-colors duration-[var(--dur-base)] hover:bg-sale-tint hover:text-sale"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function field(invalid: boolean) {
  return cn(
    // 16px on phones: anything smaller makes iOS Safari zoom the page on focus.
    "h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3 text-[16px] sm:text-[14px]",
    "placeholder:text-ink-muted focus:outline-none",
    invalid ? "border-sale focus:border-sale" : "border-line-strong focus:border-brand",
  );
}

function Row({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12px] text-sale">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
