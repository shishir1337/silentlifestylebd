/**
 * Collection sort options.
 *
 * This is presentation, not content: the client reorders what a collection
 * already contains, so there is nothing here for the admin to edit and nothing
 * to store. It lives in `lib` rather than `data` for that reason.
 *
 * The actual reordering happens in `collection-results.tsx`, against the
 * rendered cards rather than the products — see the note there on why the
 * collection routes must not read `searchParams` on the server.
 */
export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function isSortValue(v: string | undefined): v is SortValue {
  return SORT_OPTIONS.some((o) => o.value === v);
}
