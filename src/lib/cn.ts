type ClassValue = string | number | false | null | undefined;

/**
 * Minimal class joiner. Deliberately not `clsx` + `tailwind-merge`: two extra
 * runtime deps on every component is the wrong trade for an e-commerce bundle.
 *
 * The cost of that trade, so it is not discovered the hard way twice: this
 * **does not resolve conflicts**. Pass `text-ink` to a component whose variant
 * already sets `text-white` and both land on the element, where they have
 * equal specificity and stylesheet order picks the winner — silently, and
 * differently depending on which utility Tailwind happened to emit last.
 * The newsletter's submit button lost that coin toss and rendered white on
 * white until an audit caught it.
 *
 * So: a colour, size or spacing that a component already decides belongs in
 * that component's variant map, not in a `className` at the call site.
 * `className` is for what the component has no opinion about — margins,
 * widths, grid placement.
 */
export function cn(...classes: ClassValue[]): string {
  let out = "";
  for (const c of classes) {
    if (!c && c !== 0) continue;
    out = out ? `${out} ${c}` : String(c);
  }
  return out;
}
