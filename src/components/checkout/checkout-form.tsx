"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { Taka } from "@/components/ui/price";
import { ButtonLink } from "@/components/ui/button";
import { BagIcon, CashIcon, CheckIcon, ReturnIcon, TruckIcon } from "@/components/ui/icons";
import {
  deliveryChargeFor,
  validateCheckout,
  type CheckoutErrors,
  type DeliveryArea,
} from "@/lib/orders";
import { placeOrder } from "@/lib/order-actions";
import { normalisePhone } from "@/lib/phone";
import { delivery } from "@/data/site";
import { defaultAddress, useAddresses, useProfile } from "@/lib/account";
import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * Cash-on-delivery checkout.
 *
 * Deliberately one screen and five fields. Every extra step on a COD order is
 * a chance to reconsider, and there is no payment to capture — so there is no
 * reason to split this across pages or ask anyone to create an account.
 *
 * Validation runs on submit rather than per keystroke, moves focus to the first
 * bad field, and each message says how to fix it instead of just "invalid".
 *
 * The totals on this screen are a quotation, not a decision. `placeOrder`
 * re-prices every line from the database and recomputes the delivery charge
 * before it writes anything, so what the customer sees here is what they will
 * pay only because both sides are reading the same catalogue — not because the
 * server believed the number this form sent it.
 */
export function CheckoutForm() {
  const { lines, subtotal, count, ready, clear } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [area, setArea] = useState<DeliveryArea>("inside-dhaka");
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const { profile, ready: profileReady, save: saveProfile } = useProfile();
  const { addresses, ready: addressReady, upsert: saveAddress } = useAddresses();

  /**
   * Fill the form from the saved profile and default address — once, and only
   * into fields the customer has not already touched. Storage is read after
   * mount, so without the `prefilled` latch a late read would overwrite
   * whatever they had started typing.
   */
  useEffect(() => {
    if (prefilled || !profileReady || !addressReady) return;
    const saved = defaultAddress(addresses);
    if (!profile.name && !profile.phone && !saved) {
      setPrefilled(true);
      return;
    }

    setName((v) => v || saved?.recipient || profile.name);
    setPhone((v) => v || saved?.phone || profile.phone);
    setAltPhone((v) => v || profile.altPhone);
    setAddress((v) => v || saved?.address || "");
    if (saved) setArea(saved.area);
    setPrefilled(true);
  }, [prefilled, profileReady, addressReady, profile, addresses]);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  const deliveryCharge = deliveryChargeFor(area, subtotal);
  const total = subtotal + deliveryCharge;
  const shortfall = delivery.freeThreshold - subtotal;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validateCheckout({ name, phone, address });
    setErrors(found);
    setFailure(null);

    if (found.name) return nameRef.current?.focus();
    if (found.phone) return phoneRef.current?.focus();
    if (found.address) return addressRef.current?.focus();

    setPlacing(true);

    const customer = {
      name: name.trim(),
      phone: normalisePhone(phone),
      altPhone: altPhone.trim() ? normalisePhone(altPhone) : undefined,
      address: address.trim(),
      note: note.trim() || undefined,
    };

    /**
     * Only what the customer chose is sent: product, size, quantity. No
     * prices, no totals — the server works those out for itself, so there is
     * nothing here worth tampering with and nothing to go stale.
     */
    const result = await placeOrder({
      lines: lines.map((l) => ({
        productId: l.productId,
        size: l.size ?? "",
        qty: l.qty,
      })),
      ...customer,
      area,
    });

    if (!result.ok) {
      setFailure(result.message);
      setPlacing(false);
      // Back to the top: the message is above the form, and on a phone the
      // submit button is a long way from it.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    remember(customer, area);
    clear();
    // A document navigation: the confirmation is a Server Component behind an
    // access cookie the action just set, and the router would otherwise fetch
    // it with the cookie jar as it was a moment ago.
    window.location.assign(`/order/${result.orderNo}`);
  }

  /**
   * Keep what they just typed, so the next order is two taps instead of a
   * retyped address.
   *
   * This is the only place a guest's details are ever written — the account
   * area is behind sign-in, so without this a guest would be asked for the
   * same address on every single order. It runs after the order is recorded
   * and its failures are swallowed deliberately: the order is already placed,
   * and nothing about remembering an address for next time is worth showing
   * an error over, let alone blocking the confirmation.
   *
   * Signed in or not makes no difference here. The context decides where it
   * lands — this browser, or their account.
   */
  function remember(
    customer: { name: string; phone: string; altPhone?: string; address: string },
    deliveryArea: DeliveryArea,
  ) {
    const existing = defaultAddress(addresses);
    void Promise.all([
      saveProfile({
        name: customer.name,
        phone: customer.phone,
        altPhone: customer.altPhone ?? "",
        email: profile.email,
      }),
      saveAddress({
        id: existing?.id ?? "",
        label: existing?.label || "Home",
        recipient: customer.name,
        phone: customer.phone,
        address: customer.address,
        area: deliveryArea,
        isDefault: true,
      }),
    ]).catch(() => {
      // See above: best effort, never in the customer's way.
    });
  }

  // Until localStorage has been read the cart is unknown — showing "empty"
  // before then would flash the wrong screen at someone who has items.
  if (!ready) {
    return <div className="py-24" aria-busy="true" />;
  }

  if (count === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-ink-muted">
          <BagIcon className="size-7" />
        </span>
        <p className="text-[17px] font-medium">Your bag is empty</p>
        <p className="max-w-sm text-[14px] text-ink-muted">
          Add something you like, then come back to place the order.
        </p>
        <ButtonLink href="/collections" className="mt-2">
          Start shopping
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="pb-28 lg:pb-10">
      {/*
        Anything the server refused: a sold-out size, a number that failed its
        second check, a write that did not go through. Above the fold and
        scrolled to, because on a phone the submit button that triggered it is
        off the bottom of the screen.
      */}
      {failure ? (
        <p
          role="alert"
          className="mb-6 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[14px] leading-relaxed text-sale"
        >
          {failure}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        {/* ------------------------------------------------ details --------- */}
        <div>
          <section aria-labelledby="delivery-details">
            <h2 id="delivery-details" className="text-[17px] font-semibold">
              Delivery details
            </h2>

            <div className="mt-4 space-y-4">
              <Field
                label="Full name"
                id="name"
                required
                error={errors.name}
                hint="As the delivery man should ask for you."
              >
                <input
                  ref={nameRef}
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "name-error" : "name-hint"}
                  className={inputClass(Boolean(errors.name))}
                />
              </Field>

              <Field
                label="Mobile number"
                id="phone"
                required
                error={errors.phone}
                hint="We call this number before delivery."
              >
                <input
                  ref={phoneRef}
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
                  className={inputClass(Boolean(errors.phone))}
                />
              </Field>

              <Field
                label="Alternative number"
                id="altPhone"
                hint="Optional — used only if the first number is unreachable."
              >
                <input
                  id="altPhone"
                  name="altPhone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  aria-describedby="altPhone-hint"
                  className={inputClass(false)}
                />
              </Field>

              <Field
                label="Full address"
                id="address"
                required
                error={errors.address}
                hint="House or flat, road, area and district."
              >
                <textarea
                  ref={addressRef}
                  id="address"
                  name="address"
                  rows={3}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  aria-invalid={errors.address ? true : undefined}
                  aria-describedby={errors.address ? "address-error" : "address-hint"}
                  className={cn(inputClass(Boolean(errors.address)), "h-auto py-2.5")}
                />
              </Field>
            </div>
          </section>

          {/* ------------------------------------------------ area ----------- */}
          <section aria-labelledby="delivery-area" className="mt-8">
            <h2 id="delivery-area" className="text-[17px] font-semibold">
              Delivery area
            </h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <AreaOption
                value="inside-dhaka"
                current={area}
                onSelect={setArea}
                title="Inside Dhaka"
                charge={delivery.insideDhaka}
                eta={delivery.insideDhakaDays}
              />
              <AreaOption
                value="outside-dhaka"
                current={area}
                onSelect={setArea}
                title="Outside Dhaka"
                charge={delivery.outsideDhaka}
                eta={delivery.outsideDhakaDays}
              />
            </div>
          </section>

          {/* ------------------------------------------------ payment -------- */}
          <section aria-labelledby="payment" className="mt-8">
            <h2 id="payment" className="text-[17px] font-semibold">
              Payment
            </h2>
            <div className="mt-3 flex gap-3 rounded-[var(--radius-md)] border-2 border-ink bg-subtle p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
                <CashIcon className="size-[18px]" />
              </span>
              <div>
                <p className="text-[14px] font-semibold">Cash on Delivery</p>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">
                  No advance payment. Check the parcel at your door and pay the
                  delivery man only if you keep it.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="note" className="mt-8">
            <h2 id="note" className="text-[17px] font-semibold">
              Order note
            </h2>
            <Field label="Anything we should know?" id="note" hideLabel>
              <textarea
                id="note"
                name="note"
                rows={2}
                placeholder="Landmark, delivery time preference, gift wrap…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={cn(inputClass(false), "mt-3 h-auto py-2.5")}
              />
            </Field>
          </section>
        </div>

        {/* ------------------------------------------------ summary --------- */}
        <aside aria-labelledby="summary" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-md)] border border-line bg-subtle p-4">
            <h2 id="summary" className="text-[15px] font-semibold">
              Your order ({count})
            </h2>

            <ul className="mt-3 divide-y divide-line">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-3 py-3">
                  <Link
                    href={`/products/${line.slug}`}
                    className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-canvas"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="56px"
                      quality={60}
                      className="object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] leading-snug">{line.name}</p>
                    <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                      {line.size ? `Size ${line.size} · ` : ""}Qty {line.qty}
                    </p>
                  </div>
                  <Taka amount={line.price * line.qty} className="text-[13px] font-semibold" />
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd><Taka amount={subtotal} className="font-medium" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd>
                  {deliveryCharge === 0 ? (
                    <span className="font-medium text-brand">Free</span>
                  ) : (
                    <Taka amount={deliveryCharge} className="font-medium" />
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                <dt className="text-[15px] font-semibold">Total</dt>
                <dd><Taka amount={total} className="text-xl font-semibold" /></dd>
              </div>
            </dl>

            {shortfall > 0 ? (
              <p className="mt-3 flex items-center gap-2 rounded-[var(--radius-sm)] bg-canvas px-3 py-2 text-[12px] text-ink-soft">
                <TruckIcon className="size-4 shrink-0 text-ink-muted" />
                <span>
                  Add <Taka amount={shortfall} className="font-semibold" /> more for
                  free delivery.
                </span>
              </p>
            ) : (
              <p className="mt-3 flex items-center gap-2 rounded-[var(--radius-sm)] bg-brand-tint px-3 py-2 text-[12px] font-medium text-brand">
                <CheckIcon className="size-4 shrink-0" />
                Your order ships free.
              </p>
            )}

            <button
              type="submit"
              disabled={placing}
              className="mt-4 hidden h-[52px] w-full items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[15px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] hover:bg-ink/90 active:scale-[0.98] disabled:opacity-60 lg:inline-flex"
            >
              {placing ? "Placing order…" : "Place order"}
            </button>

            <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted">
              <ReturnIcon className="mt-0.5 size-3.5 shrink-0" />
              {delivery.returnWindowDays}-day easy return. Unused, with tags on.
            </p>
          </div>
        </aside>
      </div>

      {/* Sticky confirm for phones — above the tab bar, within thumb reach. */}
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-[var(--z-sticky)] flex items-center gap-3 border-t border-line bg-canvas/95 px-4 py-2.5 backdrop-blur-sm lg:hidden">
        <div className="min-w-0">
          <Taka amount={total} className="text-base font-semibold" />
          <p className="text-[11px] text-ink-muted">
            {deliveryCharge === 0 ? "Free delivery" : "Incl. delivery"}
          </p>
        </div>
        <button
          type="submit"
          disabled={placing}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[14px] font-medium text-white transition-[background-color,scale] duration-[var(--dur-base)] active:scale-[0.98] disabled:opacity-60"
        >
          {placing ? "Placing order…" : "Place order"}
        </button>
      </div>
    </form>
  );
}

/* --- Pieces --------------------------------------------------------------- */

function AreaOption({
  value,
  current,
  onSelect,
  title,
  charge,
  eta,
}: {
  value: DeliveryArea;
  current: DeliveryArea;
  onSelect: (v: DeliveryArea) => void;
  title: string;
  charge: number;
  eta: string;
}) {
  const selected = value === current;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border-2 p-3.5 transition-colors duration-[var(--dur-base)]",
        selected ? "border-ink bg-subtle" : "border-line hover:border-line-strong",
      )}
    >
      <input
        type="radio"
        name="area"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
      />
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[12px] text-ink-muted">
          <Taka amount={charge} /> · {eta}
        </span>
      </span>
    </label>
  );
}
