"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { fromEditor, toEditor } from "@/lib/rich-text";
import type { RichText } from "@/types/rich-text";
import { cn } from "@/lib/cn";

/**
 * The description editor.
 *
 * A real editor — bold, italic, bullet and numbered lists, keyboard shortcuts,
 * paste from Word without the Word — because a product description written in
 * one grey block does not sell clothes, and the client should not need a
 * developer to put the fabric on its own line.
 *
 * What it stores is not what it edits. The editor works in its own document
 * format; on every change that is converted to the small validated shape in
 * `types/rich-text`, which is what reaches the database and what the storefront
 * renders through React components. Nothing that this file cannot name
 * survives the conversion, so an editor upgrade that adds a node type cannot
 * put markup in the shop, and there is no HTML to sanitise because there is no
 * HTML.
 *
 * The toolbar is four buttons. Headings, colours and font sizes are left out
 * deliberately: inside a product page they would only let the client fight the
 * design that is already around them.
 */

const LIMITED = StarterKit.configure({
  heading: false,
  blockquote: false,
  codeBlock: false,
  code: false,
  horizontalRule: false,
  strike: false,
  link: false,
});

function ToolButton({
  editor,
  label,
  hint,
  active,
  onClick,
}: {
  editor: Editor;
  label: React.ReactNode;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      // Buttons inside a form default to submitting it; `type="button"` is
      // what keeps a click on Bold from saving the product.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={!editor.isEditable}
      aria-pressed={active}
      title={hint}
      aria-label={hint}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-xs)] px-2 text-[13px] transition-colors duration-[var(--dur-base)]",
        active ? "bg-ink text-white" : "text-ink-soft hover:bg-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  id,
  placeholder,
}: {
  value: RichText;
  onChange: (next: RichText) => void;
  id?: string;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [LIMITED],
    content: toEditor(value),
    // The editor renders in the browser only; rendering it on the server and
    // again on the client is the documented cause of a hydration mismatch here.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[140px] w-full rounded-b-[var(--radius-sm)] px-3 py-2.5",
          "text-[14px] leading-relaxed focus:outline-none",
          "[&_p]:mb-2 [&_p:last-child]:mb-0",
          "[&_ul]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1",
          "[&_ol]:mb-2 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1",
        ),
        ...(id ? { id } : {}),
        ...(placeholder ? { "aria-label": placeholder } : {}),
      },
    },
    onUpdate: ({ editor: e }) => onChange(fromEditor(e.getJSON())),
  });

  /*
    Reset the editor when the product being edited changes — the same form
    component is reused for the next product, and without this it would keep
    the previous one's words.
  */
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on a genuine swap of the incoming value, not on every keystroke — `value` in the deps would fight the editor for the caret.
  useEffect(() => {
    if (!editor) return;
    const current = fromEditor(editor.getJSON());
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(toEditor(value), { emitUpdate: false });
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="h-[180px] animate-pulse rounded-[var(--radius-sm)] border border-line-strong bg-surface" />
    );
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-line-strong bg-surface focus-within:border-brand">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1.5">
        <ToolButton
          editor={editor}
          label={<span className="font-bold">B</span>}
          hint="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolButton
          editor={editor}
          label={<span className="italic">I</span>}
          hint="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <ToolButton
          editor={editor}
          label="• List"
          hint="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          editor={editor}
          label="1. List"
          hint="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
