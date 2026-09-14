"use client";

import { useState } from "react";
import { Taka } from "@/components/ui/price";
import { CheckIcon, PinIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { useAddresses, type Address } from "@/lib/account";
import { validateCheckout, type CheckoutErrors } from "@/lib/orders";
import { Field, inputClass } from "@/components/ui/field";
import { useDelivery } from "@/lib/site-settings";
import { cn } from "@/lib/cn";

/** An empty id means "not saved yet" — whichever store owns it mints its own. */
const blank = (): Address => ({
  id: "",
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
 * so the two must accept exactly the same input. For a signed-in customer the
 * server validates again before writing; this is the courtesy, that is the
 * decision.
 */
export function AccountAddresses() {
  const delivery = useDelivery();
  const { addresses, ready, signedIn, upsert, remove, makeDefault } = useAddresses();
  const [draft, setDraft] = useState<Address | null>(null);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return <div className="py-20" aria-busy="true" />;

  /**
   * A real submit handler on a real form. This used to be a click handler on a
   * `type="button"` outside any form, which meant no Enter-to-submit, no
   * native required-field semantics, and nothing for a password manager to
   * recognise — all of which people expect from an address form.
   */
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;

    const found = validateCheckout({
      name: draft.recipient,
      phone: draft.phone,
      address: draft.address,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    setFailure(null);
    try {
      await upsert({ ...draft, label: draft.label.trim() || "Address" });
      setDraft(null);
      setErrors({});
    } catch (error) {
      setFailure(
        error instanceof Error && error.message
          ? error.message
          : "Could not save that address. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  /** Server actions can fail; a silent no-op would look like a bug. */
  async function run(action: Promise<void>) {
    setFailure(null);
    try {
      await action;
    } catch (error) {
      setFailure(
        error instanceof Error && error.message
          ? error.message
          : "That did not go through. Check your connection and try again.",
      );
    }
  }

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] sm:text-[30px]">
            Addresses
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {signedIn
              ? "Saved to your account, so they follow you to any device."
              : "Saved in this browser and used to fill in checkout."}
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

      {failure ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
        >
          {failure}
        </p>
      ) : null}

      {draft ? (
        <form
          onSubmit={save}
          noValidate
          className="mt-5 rounded-[var(--radius-md)] border-2 border-ink p-4"
        >
          <h2 className="text-[15px] font-semibold">
            {draft.id ? "Edit address" : "New address"}
          </h2>

          <div className="mt-4 space-y-4">
            <Field label="Label" id="label" hint="Home, Office — whatever you call it.">
              <input
                id="label"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className={inputClass()}
              />
            </Field>

            <Field label="Recipient name" id="recipient" error={errors.name}>
              <input
                id="recipient"
                autoComplete="name"
                value={draft.recipient}
                onChange={(e) => setDraft({ ...draft, recipient: e.target.value })}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "recipient-error" : undefined}
                className={inputClass(Boolean(errors.name))}
              />
            </Field>

            <Field label="Mobile number" id="addr-phone" error={errors.phone}>
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
                className={inputClass(Boolean(errors.phone))}
              />
            </Field>

            <Field label="Full address" id="addr-line" error={errors.address}>
              <textarea
                id="addr-line"
                rows={3}
                autoComplete="street-address"
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                aria-invalid={errors.address ? true : undefined}
                aria-describedby={errors.address ? "addr-line-error" : undefined}
                className={cn(inputClass(Boolean(errors.address)), "h-auto py-2.5")}
              />
            </Field>

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
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] bg-ink px-5 text-[14px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:flex-1"
            >
              {busy ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setErrors({});
                setFailure(null);
              }}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border border-line-strong px-5 text-[14px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink sm:flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
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
                    onClick={() => run(makeDefault(a.id))}
                    className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[12px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink"
                  >
                    Make default
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => run(remove(a.id))}
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
