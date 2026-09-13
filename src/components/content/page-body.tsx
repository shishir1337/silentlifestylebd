import { Section, Bullets } from "@/components/ui/page-header";
import type { PageSection } from "@/lib/page-blocks";

/**
 * Renders an editable page through the storefront's own components.
 *
 * Nothing here is `dangerouslySetInnerHTML`. The blocks are text and lists, so
 * React escapes every string — a client who types a `<script>` into the privacy
 * policy publishes the characters, not the script. That is the whole reason
 * the body is structured rather than HTML.
 */
export function PageBody({ sections }: { sections: PageSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <Section key={section.id} id={section.id} title={section.title}>
          {section.blocks.map((block, i) =>
            block.kind === "text" ? (
              <p key={i}>{block.text}</p>
            ) : (
              <Bullets key={i} items={block.items} />
            ),
          )}
        </Section>
      ))}
    </>
  );
}
