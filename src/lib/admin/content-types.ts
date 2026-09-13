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
