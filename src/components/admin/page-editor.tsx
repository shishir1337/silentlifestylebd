"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card } from "./admin-ui";
import { useToast } from "./toast";
import { savePage } from "@/lib/admin/content-actions";
import { slugifySection, type PageBlock, type PageSection } from "@/lib/page-blocks";
import type { AdminPage } from "@/lib/admin/content-reads";
import { cn } from "@/lib/cn";

/**
 * The policy page editor.
 *
 * Blocks, not a rich-text box. A page is sections, each holding paragraphs and
 * bullet lists — which is exactly what the storefront renders, so the client
 * cannot produce something the design cannot show, cannot break the layout
 * with a stray tag, and cannot paste styling that fights the rest of the shop.
 * There is also nothing to sanitise, because there is no markup.
 *
 * Privacy and terms carry a warning before saving. They are statements to
 * customers about data and money, and the person editing them should be
 * reminded of that at the moment they click the button — not in onboarding
 * they read once.
 */
const LEGAL = new Set(["privacy", "terms"]);

export function PageEditor({ page }: { page: AdminPage }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [title, setTitle] = useState(page.title);
  const [lead, setLead] = useState(page.lead ?? "");
  const [isActive, setIsActive] = useState(page.isActive);
  const [sections, setSections] = useState<PageSection[]>(page.sections);

  const patch = (i: number, next: Partial<PageSection>) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...next } : s)));

  const patchBlock = (si: number, bi: number, next: PageBlock) =>
    setSections((prev) =>
      prev.map((s, idx) =>
        idx === si ? { ...s, blocks: s.blocks.map((b, j) => (j === bi ? next : b)) } : s,
      ),
    );

  function moveSection(i: number, delta: number) {
    const t = i + delta;
    if (t < 0 || t >= sections.length) return;
    const next = [...sections];
    [next[i], next[t]] = [next[t], next[i]];
    setSections(next);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (LEGAL.has(page.slug) && !confirming) {
      setConfirming(true);
      return;
    }
    setFailure(null);
    startTransition(async () => {
      const result = await savePage({
        slug: page.slug,
        title,
        lead,
        sections,
        isActive,
      });
      setConfirming(false);
      if (!result.ok) {
        setFailure(result.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(`${title} saved. The page is live.`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-5">
      {failure ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[14px] text-sale"
        >
          {failure}
        </p>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Heading</h2>
          <Link
            href={`/${page.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-[12.5px] font-medium text-brand underline underline-offset-2"
          >
            View on shop
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          <Field label="Page title" id="pg-title" required>
            <input
              id="pg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass()}
            />
          </Field>
          <Field label="Opening line" id="pg-lead" hint="Sits under the title. Optional.">
            <textarea
              id="pg-lead"
              rows={2}
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              className={cn(inputClass(), "h-auto py-2.5")}
            />
          </Field>
        </div>
      </Card>

      {sections.map((section, si) => (
        <Card key={si} className="p-4">
          <div className="flex items-start gap-2">
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => moveSection(si, -1)}
                disabled={si === 0}
                aria-label={`Move “${section.title}” up`}
                className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSection(si, 1)}
                disabled={si === sections.length - 1}
                aria-label={`Move “${section.title}” down`}
                className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
              >
                ↓
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <label htmlFor={`sec-${si}`} className="sr-only">
                Section heading
              </label>
              <input
                id={`sec-${si}`}
                value={section.title}
                onChange={(e) =>
                  patch(si, {
                    title: e.target.value,
                    // The anchor follows the heading only while it is new;
                    // a published link should not break because of a reword.
                    id: section.id || slugifySection(e.target.value),
                  })
                }
                placeholder="Section heading"
                className={cn(inputClass(), "font-semibold")}
              />

              <div className="mt-3 space-y-3">
                {section.blocks.map((block, bi) => (
                  <div key={bi} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {block.kind === "text" ? (
                        <>
                          <label htmlFor={`b-${si}-${bi}`} className="sr-only">
                            Paragraph
                          </label>
                          <textarea
                            id={`b-${si}-${bi}`}
                            rows={3}
                            value={block.text}
                            onChange={(e) =>
                              patchBlock(si, bi, { kind: "text", text: e.target.value })
                            }
                            placeholder="Write a paragraph…"
                            className={cn(inputClass(), "h-auto py-2.5 text-[13.5px]")}
                          />
                        </>
                      ) : (
                        <>
                          <label htmlFor={`b-${si}-${bi}`} className="block text-[11.5px] font-medium text-ink-muted">
                            Bullet list — one per line
                          </label>
                          <textarea
                            id={`b-${si}-${bi}`}
                            rows={Math.max(3, block.items.length + 1)}
                            value={block.items.join("\n")}
                            onChange={(e) =>
                              patchBlock(si, bi, {
                                kind: "bullets",
                                // Split on save, not on keystroke: splitting
                                // as they type eats the newline they just
                                // pressed and the list becomes unwritable.
                                items: e.target.value.split("\n"),
                              })
                            }
                            placeholder={"First point\nSecond point"}
                            className={cn(inputClass(), "mt-1 h-auto py-2.5 text-[13.5px]")}
                          />
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        patch(si, { blocks: section.blocks.filter((_, j) => j !== bi) })
                      }
                      aria-label="Remove this block"
                      className="mt-1 shrink-0 text-[12px] text-ink-muted hover:text-sale"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patch(si, { blocks: [...section.blocks, { kind: "text", text: "" }] })
                  }
                  className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium hover:border-ink"
                >
                  Add paragraph
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patch(si, { blocks: [...section.blocks, { kind: "bullets", items: [""] }] })
                  }
                  className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium hover:border-ink"
                >
                  Add bullet list
                </button>
                <button
                  type="button"
                  onClick={() => setSections((prev) => prev.filter((_, j) => j !== si))}
                  className="ml-auto inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2.5 text-[12.5px] font-medium text-ink-muted hover:text-sale"
                >
                  Remove section
                </button>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <button
        type="button"
        onClick={() =>
          setSections((prev) => [
            ...prev,
            { id: "", title: "", blocks: [{ kind: "text", text: "" }] },
          ])
        }
        className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong px-4 text-[13.5px] font-medium text-ink-soft hover:border-ink hover:text-ink"
      >
        Add a section
      </button>

      <Card className="p-4">
        <label className="flex items-start gap-2.5 text-[14px]">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
          />
          <span>
            Show this page on the shop
            <span className="mt-0.5 block text-[12px] text-ink-muted">
              The footer links to it. Hiding it leaves that link pointing at
              nothing, so remove the link too.
            </span>
          </span>
        </label>
      </Card>

      {confirming ? (
        <div className="rounded-[var(--radius-md)] border border-sale/40 bg-sale/5 p-4">
          <p className="text-[14px] font-medium">This page is a promise to customers</p>
          <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-soft">
            {page.slug === "privacy"
              ? "It states what you do with people's names, numbers and addresses. If the shop starts doing something different — adding tracking, a payment gateway, a marketing list — this has to say so."
              : "It sets out what a customer agrees to when they order. Changing it changes the terms of every order placed afterwards."}{" "}
            Have a lawyer read anything substantial.
          </p>
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Publishing…" : "I understand — publish it"}
            </Button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[14px] font-medium"
            >
              Keep editing
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : "Save and publish"}
          </Button>
          <p className="text-[12.5px] text-ink-muted">
            Last changed{" "}
            {new Date(page.updatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      )}
    </form>
  );
}
