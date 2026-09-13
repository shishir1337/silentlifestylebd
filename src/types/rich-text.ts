/**
 * The shape of a formatted description.
 *
 * Not HTML. The editor in the admin is a real rich-text editor — a toolbar,
 * bold, italic, lists — but what it stores is this: a list of blocks, each a
 * list of runs of text carrying marks. The storefront renders it through React
 * components, so no markup from the database ever reaches the page.
 *
 * That is the whole reason for the shape. HTML in a column needs a sanitiser
 * on every save and on every render, and the day one is forgotten a product
 * description becomes a script tag. There is nothing to sanitise here, because
 * there is nothing to execute: a `<script>` typed into the editor is text, and
 * text is all it can ever be.
 *
 * Deliberately small. Bold, italic, paragraphs and two kinds of list is what a
 * clothing description needs; headings and colours inside a product page would
 * only let the client fight the design that is already around them.
 */

export type RichMark = "bold" | "italic";

export interface RichSpan {
  text: string;
  marks?: RichMark[];
}

export type RichBlock =
  | { kind: "p"; spans: RichSpan[] }
  | { kind: "ul"; items: RichSpan[][] }
  | { kind: "ol"; items: RichSpan[][] };

export type RichText = RichBlock[];
