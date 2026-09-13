/**
 * The shape of the settings, with nothing else in it.
 *
 * Separate from `settings.ts` because that module is `server-only` and this
 * one is imported by the client context. A type-only import is erased by
 * TypeScript but the bundler still resolves the specifier, so importing these
 * types from the server module pulls `server-only` into the browser graph and
 * the chunk fails to build — quietly, as a 500 on a script tag rather than an
 * error anyone is shown.
 */

export interface DeliverySettings {
  insideDhaka: number;
  outsideDhaka: number;
  /** Goods subtotal above which delivery is free. */
  freeThreshold: number;
  insideDhakaDays: string;
  outsideDhakaDays: string;
  returnWindowDays: number;
}

export interface SiteSettings {
  name: string;
  /** The registered business name, used in structured data. */
  legalName: string;
  tagline: string;
  description: string;
  /** Dialable, e.g. `+8801711000000`. */
  phone: string;
  /** The same number written for humans. */
  phoneDisplay: string;
  email: string;
  address: string;
  delivery: DeliverySettings;
}
