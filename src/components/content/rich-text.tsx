import type { RichSpan, RichText } from "@/types/rich-text";

/**
 * A formatted description, rendered.
 *
 * Every node is a React element chosen by this file — there is no
 * `dangerouslySetInnerHTML` and no HTML string anywhere on the path from the
 * admin to the page. A `<script>` typed into the editor arrives here as the
 * text of a span and is rendered as the characters it is.
 *
 * The prose styles are the storefront's, not the editor's. What the client
 * writes joins the design rather than arriving with its own.
 */

function Spans({ spans }: { spans: RichSpan[] }) {
  return (
    <>
      {spans.map((span, i) => {
        let node: React.ReactNode = span.text;
        if (span.marks?.includes("italic")) node = <em key="i">{node}</em>;
        if (span.marks?.includes("bold")) node = <strong key="b">{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

export function RichTextBody({
  value,
  fallback,
  className,
}: {
  /**
   * Optional on purpose. A cached page rendered before this field existed
   * still holds the old shape, and a product description is not worth taking
   * a page down for — the plain fallback is right there.
   */
  value: RichText | undefined | null;
  /** Shown for products written before the editor existed. */
  fallback?: string;
  className?: string;
}) {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback ? <p className={className}>{fallback}</p> : null;
  }

  return (
    <div className={className}>
      {value.map((block, i) => {
        if (block.kind === "p") {
          return (
            <p key={i} className={i > 0 ? "mt-3" : undefined}>
              <Spans spans={block.spans} />
            </p>
          );
        }

        const List = block.kind === "ul" ? "ul" : "ol";
        return (
          <List
            key={i}
            className={`ml-4 list-outside space-y-1 ${
              block.kind === "ul" ? "list-disc" : "list-decimal"
            } ${i > 0 ? "mt-3" : ""}`}
          >
            {block.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
