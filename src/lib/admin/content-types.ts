/**
 * Shapes the content forms send.
 *
 * Separate from `content-actions.ts` because that file carries `"use server"`,
 * where every export becomes a callable endpoint.
 */

/**
 * The sizes the carousel is built around.
 *
 * Not a style preference. Within a breakpoint every slide must share a ratio,
 * or the flex track takes the tallest and the carousel changes height as it
 * scrolls — a bug found and fixed once already, and one a well-meaning upload
 * of a square photo would reintroduce.
 *
 * They live here rather than beside the validator that uses them because that
 * file carries `"use server"`, where **every** export must be an async
 * function. Exporting a plain object from it compiles cleanly and then throws
 * at runtime: "A \"use server\" file can only export async functions, found
 * object" — a 500 on every save, with nothing wrong at build time.
 */
export const HERO_DESKTOP = { width: 1920, height: 600 } as const;
export const HERO_MOBILE = { width: 1000, height: 700 } as const;

export interface HeroSlideInput {
  id?: string;
  desktopAssetId: string;
  mobileAssetId: string;
  /** What the artwork says, word for word. The only readable copy of it. */
  alt: string;
  href: string;
  label: string;
  isActive: boolean;
}

export interface PromoTileInput {
  id?: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  assetId: string;
  isActive: boolean;
}

export interface SizeChartInput {
  id?: string;
  /** Only used when creating; slugs anchor links from product pages. */
  slug?: string;
  title: string;
  note: string;
  columns: string[];
  /** One array of cells per row; padded to the column count on save. */
  rows: string[][];
  isActive: boolean;
}

export interface NavItemInput {
  id?: string;
  group: "PRIMARY" | "HELP" | "COMPANY";
  label: string;
  href: string;
  highlight: boolean;
  isActive: boolean;
}

export interface AnnouncementInput {
  id?: string;
  text: string;
  icon: "NONE" | "CASH" | "TRUCK" | "RETURN" | "SHIELD";
  href: string;
  wideOnly: boolean;
  isActive: boolean;
}

/**
 * What the client may write into an announcement, and what each one becomes.
 *
 * Offered as buttons in the editor rather than documented somewhere they would
 * have to remember. Typing the number instead makes a second copy of something
 * the settings already own, which is how a strip ends up advertising a free
 * delivery threshold the checkout stopped honouring months ago.
 */
/**
 * Fills the placeholders in, for the preview.
 *
 * The same substitution the storefront does, so "what customers see" is what
 * customers see — a preview showing `{free-over}` is a preview of the wrong
 * thing, and the one place the client will look to check their work.
 */
export function resolveTokens(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(/\{[a-z-]+\}/g, (m) => values[m] ?? m);
}

export const ANNOUNCEMENT_TOKENS = [
  { token: "{free-over}", means: "Free delivery threshold" },
  { token: "{inside-dhaka}", means: "Delivery charge inside Dhaka" },
  { token: "{outside-dhaka}", means: "Delivery charge outside Dhaka" },
  { token: "{return-days}", means: "Return window in days" },
  { token: "{phone}", means: "Your phone number" },
] as const;

/**
 * How many messages the announcement strip can carry.
 *
 * Here rather than beside the action that enforces it, because a `"use server"`
 * module may only export async functions — a number exported from one is a
 * build error. Both sides import it from here so the button the panel greys
 * out and the rule the server refuses on cannot drift apart.
 *
 * Three because the strip is one line across the top of every page. A fourth
 * wraps it to two rows everywhere at once.
 */
export const MAX_ANNOUNCEMENTS = 3;
