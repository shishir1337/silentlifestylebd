"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card, Pill } from "./admin-ui";
import { useToast } from "./toast";
import {
  saveAnnouncement,
  deleteAnnouncement,
  reorderAnnouncements,
} from "@/lib/admin/content-actions";
import {
  MAX_ANNOUNCEMENTS,
  ANNOUNCEMENT_TOKENS,
  resolveTokens,
  type AnnouncementInput,
} from "@/lib/admin/content-types";
import type { AdminAnnouncement } from "@/lib/admin/content-reads";
import { cn } from "@/lib/cn";

/**
 * The strip above the shop.
 *
 * Short, few, and ordered — which is the whole design. Three messages is the
 * most a one-line strip can hold, and the editor says so rather than letting
 * the client discover it on a phone.
 *
 * The placeholder buttons are the important part. A shop writing "free over
 * ৳3,000" by hand has made a second copy of a number the settings already own,
 * and the two disagree the first time one changes — this project has had that
 * bug in three other places. Tapping `{free-over}` writes something that
 * cannot go stale.
 */

const ICONS: { value: AnnouncementInput["icon"]; label: string }[] = [
  { value: "NONE", label: "No icon" },
  { value: "CASH", label: "Cash" },
  { value: "TRUCK", label: "Delivery" },
  { value: "RETURN", label: "Returns" },
  { value: "SHIELD", label: "Genuine" },
];

const BLANK: AnnouncementInput = {
  text: "",
  icon: "NONE",
  href: "",
  wideOnly: false,
  isActive: true,
};

export function AnnouncementManager({
  items,
  tokenValues,
}: {
  items: AdminAnnouncement[];
  /** Resolved from the settings on the server, so the preview is not a lie. */
  tokenValues: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [editing, setEditing] = useState<AnnouncementInput | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  function run(work: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setFailure(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setFailure(result.message ?? "That did not work.");
        return;
      }
      setEditing(null);
      setConfirming(null);
      toast.success(done);
      router.refresh();
    });
  }

  const move = (i: number, delta: number) => {
    const t = i + delta;
    if (t < 0 || t >= items.length) return;
    const ids = items.map((x) => x.id);
    [ids[i], ids[t]] = [ids[t], ids[i]];
    run(() => reorderAnnouncements(ids), "Order saved.");
  };

  return (
    <div className="max-w-3xl space-y-5">
      {failure ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[14px] text-sale"
        >
          {failure}
        </p>
      ) : null}

      {/* A true preview: the same dark strip, in the same order. */}
      <Card className="overflow-hidden p-0">
        <p className="border-b border-line px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
          What customers see
        </p>
        <div className="flex h-10 items-center justify-center gap-x-6 bg-ink px-4 text-xs text-white">
          {items.filter((i) => i.isActive).length === 0 ? (
            <span className="text-white/50">Nothing — the strip is hidden</span>
          ) : (
            items
              .filter((i) => i.isActive)
              .map((i) => (
                <span
                  key={i.id}
                  className={cn("whitespace-nowrap", i.wideOnly && "hidden sm:inline")}
                >
                  {resolveTokens(i.text, tokenValues)}
                </span>
              ))
          )}
        </div>
      </Card>

      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={item.id}>
            <Card className="p-3.5">
              <div className="flex items-start gap-2">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || pending}
                    aria-label={`Move “${item.text}” earlier`}
                    className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1 || pending}
                    aria-label={`Move “${item.text}” later`}
                    className="inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-medium">{item.text}</p>
                    {!item.isActive ? <Pill tone="off">Hidden</Pill> : null}
                    {item.wideOnly ? <Pill tone="off">Not on phones</Pill> : null}
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {item.icon === "NONE" ? "No icon" : ICONS.find((x) => x.value === item.icon)?.label}
                    {item.href ? ` · links to ${item.href}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: item.id,
                      text: item.text,
                      icon: item.icon,
                      href: item.href ?? "",
                      wideOnly: item.wideOnly,
                      isActive: item.isActive,
                    })
                  }
                  className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium hover:border-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(item.id)}
                  className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] px-2 text-[12.5px] font-medium text-ink-muted hover:text-sale"
                >
                  Remove
                </button>
              </div>

              {confirming === item.id ? (
                <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 p-2.5">
                  <span className="text-[13px]">Remove this message?</span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => deleteAnnouncement(item.id), "Message removed.")}
                  >
                    Remove
                  </Button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium"
                  >
                    Keep it
                  </button>
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>

      {editing ? (
        <Editor
          value={editing}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(next) =>
            run(() => saveAnnouncement(next), next.id ? "Message saved." : "Message added.")
          }
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing({ ...BLANK })}
            disabled={items.length >= MAX_ANNOUNCEMENTS}
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong px-4 text-[13.5px] font-medium text-ink-soft hover:border-ink hover:text-ink disabled:opacity-40"
          >
            Add a message
          </button>
          {items.length >= MAX_ANNOUNCEMENTS ? (
            <p className="text-[12.5px] text-ink-muted">
              Three is the most a one-line strip can hold. Remove one first.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Editor({
  value,
  pending,
  onSave,
  onCancel,
}: {
  value: AnnouncementInput;
  pending: boolean;
  onSave: (v: AnnouncementInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(value);
  const set = <K extends keyof AnnouncementInput>(k: K, v: AnnouncementInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">
        {value.id ? "Edit the message" : "New message"}
      </h2>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <Field
          label="Message"
          id="ann-text"
          required
          hint="One short line. Under 90 characters."
        >
          <input
            id="ann-text"
            value={form.text}
            onChange={(e) => set("text", e.target.value)}
            placeholder="Cash on Delivery nationwide"
            className={inputClass()}
          />
        </Field>

        <div>
          <p className="text-[12.5px] font-medium">Insert a live number</p>
          <p className="mt-0.5 mb-2 text-[12px] leading-snug text-ink-muted">
            These fill themselves in from your settings, so the strip cannot end
            up advertising a delivery charge you have since changed.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ANNOUNCEMENT_TOKENS.map((t) => (
              <button
                key={t.token}
                type="button"
                title={t.means}
                onClick={() => set("text", `${form.text}${t.token}`)}
                className="inline-flex h-8 items-center rounded-full border border-line-strong px-2.5 font-mono text-[11.5px] hover:border-ink"
              >
                {t.token}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Icon" id="ann-icon">
            <select
              id="ann-icon"
              value={form.icon}
              onChange={(e) => set("icon", e.target.value as AnnouncementInput["icon"])}
              className={inputClass()}
            >
              {ICONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Links to (optional)"
            id="ann-href"
            hint="A page on this shop, e.g. /delivery."
          >
            <input
              id="ann-href"
              value={form.href}
              onChange={(e) => set("href", e.target.value)}
              placeholder="/delivery"
              className={inputClass()}
            />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 text-[14px]">
          <input
            type="checkbox"
            checked={form.wideOnly}
            onChange={(e) => set("wideOnly", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
          />
          <span>
            Hide on phones
            <span className="mt-0.5 block text-[12px] text-ink-muted">
              Most of your customers are on a phone, where the strip fits about
              one message. Use this for the second and third.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2.5 text-[14px]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
          />
          <span>Show this message</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[14px] font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
