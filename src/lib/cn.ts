type ClassValue = string | number | false | null | undefined;

/**
 * Minimal class joiner. Deliberately not `clsx` + `tailwind-merge`: this app
 * has no conflicting-class problem to solve, and two extra runtime deps on
 * every component is the wrong trade for an e-commerce bundle.
 */
export function cn(...classes: ClassValue[]): string {
  let out = "";
  for (const c of classes) {
    if (!c && c !== 0) continue;
    out = out ? `${out} ${c}` : String(c);
  }
  return out;
}
