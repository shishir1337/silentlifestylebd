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

/** Who fires the standard Meta events: this site's own pixel, or a GTM tag. */
export type MetaEventsVia = "direct" | "gtm";

/**
 * Advertising tags, as the shop's own marketing people set them.
 *
 * All three are public by nature — a container id and a pixel id are visible
 * in the page source of every shop that uses them, which is why they belong in
 * Settings rather than in an environment variable only a developer can reach.
 * Blank means "not set up", and nothing is loaded at all: an empty GTM id
 * would otherwise request `gtm.js?id=` on every page view for no purpose.
 */
export interface TrackingSettings {
  /** Google Tag Manager container, e.g. `GTM-ABC1234`. */
  gtmId: string;
  /** Meta (Facebook) pixel, a 15 or 16 digit number. */
  metaPixelId: string;
  /**
   * The double-counting switch.
   *
   * `direct` — this site loads the pixel and calls `fbq` itself.
   * `gtm`    — this site only pushes to `dataLayer`; a GTM tag sends to Meta.
   *
   * Doing both counts every sale twice, and an advertiser optimising against
   * doubled conversions bids on numbers that do not exist.
   */
  metaEventsVia: MetaEventsVia;
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
  /**
   * Where the shop is, off the shop.
   *
   * Empty means "we are not on that one", and the link is not rendered — an
   * icon linking to facebook.com rather than to the page is worse than no
   * icon, and that is exactly what these were hardcoded to.
   */
  social: SocialLinks;
  delivery: DeliverySettings;
  tracking: TrackingSettings;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  /** Just the number; the wa.me URL is built from it. */
  whatsapp: string;
}
