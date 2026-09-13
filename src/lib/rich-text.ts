import type { RichBlock, RichMark, RichSpan, RichText } from "@/types/rich-text";

/**
 * Reading, writing and flattening formatted descriptions.
 *
 * Three conversions, and each exists for a boundary:
 *
 * `toRichText` is the database boundary. The column is `Json`, so at the type
 * level it could hold anything, and one bad row must render an empty
 * description rather than take down a product page. Nothing is cast; every
 * field is checked on the way out.
 *
 * `fromEditor` is the editor boundary. The editor's document format is its
 * own, richer than this, and versions of it change. Converting on save means a
 * node type we do not render can never be stored, and an editor upgrade cannot
 * quietly change what is in the database.
 *
 * `toPlainText` is the everything-else boundary. Search indexes words, the
 * meta description is a single line, and structured data wants no markup at
 * all. Deriving that from the formatted text keeps one thing for the client to
 * edit instead of two that drift apart.
 */

const MARKS: RichMark[] = ["bold", "italic"];

function toSpans(value: unknown): RichSpan[] {
  if (!Array.isArray(value)) return [];
  const spans: RichSpan[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    if (typeof s.text !== "string" || s.text.length === 0) continue;

    const marks = Array.isArray(s.marks)
      ? (s.marks.filter((m): m is RichMark => MARKS.includes(m as RichMark)) as RichMark[])
      : [];

    spans.push(marks.length > 0 ? { text: s.text, marks } : { text: s.text });
  }

  return spans;
}

function toItems(value: unknown): RichSpan[][] {
  if (!Array.isArray(value)) return [];
  return value.map(toSpans).filter((item) => item.length > 0);
}

export function toRichText(value: unknown): RichText {
  if (!Array.isArray(value)) return [];
  const blocks: RichText = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;

    if (b.kind === "p") {
      const spans = toSpans(b.spans);
      if (spans.length > 0) blocks.push({ kind: "p", spans });
    } else if (b.kind === "ul" || b.kind === "ol") {
      const items = toItems(b.items);
      if (items.length > 0) blocks.push({ kind: b.kind, items });
    }
  }

  return blocks;
}

/** True when there is nothing worth rendering. */
export function isEmptyRichText(value: RichText): boolean {
  return value.every((b) =>
    b.kind === "p"
      ? b.spans.every((s) => s.text.trim() === "")
      : b.items.length === 0,
  );
}

/* --- the editor's format ---------------------------------------------------
   ProseMirror documents, which is what the editor hands over. Typed loosely on
   purpose: this is the one place that touches a third party's shape, and it is
   converted immediately rather than carried around. */

interface EditorNode {
  type?: string;
  text?: string;
  content?: EditorNode[];
  marks?: { type?: string }[];
}

function spansFrom(node: EditorNode | undefined): RichSpan[] {
  if (!node?.content) return [];
  const spans: RichSpan[] = [];

  for (const child of node.content) {
    if (child.type !== "text" || typeof child.text !== "string" || !child.text) continue;
    const marks = (child.marks ?? [])
      .map((m) => m.type)
      .filter((m): m is RichMark => MARKS.includes(m as RichMark));
    spans.push(marks.length > 0 ? { text: child.text, marks } : { text: child.text });
  }

  return spans;
}

export function fromEditor(doc: unknown): RichText {
  const root = doc as EditorNode | null;
  if (!root?.content) return [];

  const blocks: RichText = [];
  for (const node of root.content) {
    if (node.type === "paragraph") {
      const spans = spansFrom(node);
      if (spans.length > 0) blocks.push({ kind: "p", spans });
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      const items = (node.content ?? [])
        // A list item wraps a paragraph, which is where the text lives.
        .map((li) => spansFrom(li.content?.[0]))
        .filter((spans) => spans.length > 0);
      if (items.length > 0) {
        blocks.push({ kind: node.type === "bulletList" ? "ul" : "ol", items });
      }
    }
  }

  return blocks;
}

export function toEditor(rich: RichText): Record<string, unknown> {
  const spanNodes = (spans: RichSpan[]): EditorNode[] =>
    spans.map((s) => ({
      type: "text",
      text: s.text,
      ...(s.marks?.length ? { marks: s.marks.map((type) => ({ type })) } : {}),
    }));

  return {
    type: "doc",
    content:
      rich.length > 0
        ? rich.map((b) =>
            b.kind === "p"
              ? { type: "paragraph", content: spanNodes(b.spans) }
              : {
                  type: b.kind === "ul" ? "bulletList" : "orderedList",
                  content: b.items.map((item) => ({
                    type: "listItem",
                    content: [{ type: "paragraph", content: spanNodes(item) }],
                  })),
                },
          )
        : [{ type: "paragraph" }],
  };
}

/**
 * The same words with the formatting taken off.
 *
 * Blocks are joined with a space rather than a newline: every caller wants one
 * line — a meta description, a JSON-LD field, a haystack for search.
 */
export function toPlainText(rich: RichText): string {
  const parts: string[] = [];

  for (const block of rich) {
    if (block.kind === "p") {
      parts.push(block.spans.map((s) => s.text).join(""));
    } else {
      for (const item of block.items) parts.push(item.map((s) => s.text).join(""));
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** A plain paragraph as rich text, for products written before the editor. */
export function fromPlainText(text: string): RichText {
  const trimmed = text.trim();
  return trimmed ? [{ kind: "p", spans: [{ text: trimmed }] }] : [];
}

export type { RichBlock, RichSpan, RichText };
