/**
 * The shape of an editable page.
 *
 * A page is a list of sections; a section is a heading and a list of blocks;
 * a block is a paragraph or a bullet list. That is not an arbitrary model —
 * it is exactly what the storefront's `Section` and `Bullets` components
 * render, which is the point. The editor cannot produce something the design
 * cannot show, and the design cannot drift from what the editor offers.
 *
 * The alternative the schema first specified was HTML. It would need a
 * sanitiser on every save, would let one unclosed tag break the page around
 * it, and would throw away the components that keep these pages looking like
 * the rest of the shop.
 */

export type PageBlock =
  | { kind: "text"; text: string }
  | { kind: "bullets"; items: string[] };

export interface PageSection {
  /** Anchor id, so a policy can be linked to by paragraph. */
  id: string;
  title: string;
  blocks: PageBlock[];
}

/**
 * Reads whatever is in the database as sections, or gives back nothing.
 *
 * The column is `Json`, so at the type level it could hold anything — and one
 * bad row must render an empty page, not crash the shop. Everything is checked
 * rather than cast.
 */
export function toSections(value: unknown): PageSection[] {
  if (!Array.isArray(value)) return [];

  const sections: PageSection[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    if (typeof s.title !== "string" || !Array.isArray(s.blocks)) continue;

    const blocks: PageBlock[] = [];
    for (const b of s.blocks) {
      if (!b || typeof b !== "object") continue;
      const block = b as Record<string, unknown>;
      if (block.kind === "text" && typeof block.text === "string") {
        blocks.push({ kind: "text", text: block.text });
      } else if (block.kind === "bullets" && Array.isArray(block.items)) {
        const items = block.items.filter((i): i is string => typeof i === "string");
        if (items.length > 0) blocks.push({ kind: "bullets", items });
      }
    }

    sections.push({
      id: typeof s.id === "string" && s.id ? s.id : slugifySection(s.title),
      title: s.title,
      blocks,
    });
  }
  return sections;
}

export function slugifySection(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
}
