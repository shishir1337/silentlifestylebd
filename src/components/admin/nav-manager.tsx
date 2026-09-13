"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card, EmptyState, Pill } from "./admin-ui";
import { useToast } from "./toast";
import { deleteNavItem, reorderNavItems, saveNavItem } from "@/lib/admin/content-actions";
import type { AdminNavItem } from "@/lib/admin/content-reads";
import { cn } from "@/lib/cn";

/**
 * The three menus.
 *
 * Links are chosen from a list of real pages rather than typed. A typo in a
 * menu is a 404 the client will never notice — they know where their own pages
 * are, so they do not click their own navigation — and the usual way a small
 * shop's menu quietly breaks is a renamed collection nobody re-linked.
 */
const GROUPS = [
  {
    key: "PRIMARY" as const,
    title: "Main menu",
    hint: "The top of every page, and the phone menu.",
  },
  { key: "HELP" as const, title: "Help", hint: "First footer column." },
  { key: "COMPANY" as const, title: "Company", hint: "Second footer column." },
];

export function NavManager({
  items,
  targets,
}: {
  items: AdminNavItem[];
  targets: { href: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [all, setAll] = useState(items);
  const [editing, setEditing] = useState<AdminNavItem | { group: AdminNavItem["group"] } | null>(
    null,
  );

  function move(group: AdminNavItem["group"], index: number, delta: number) {
    const inGroup = all.filter((i) => i.group === group);
    const target = index + delta;
    if (target < 0 || target >= inGroup.length) return;

    const reordered = [...inGroup];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setAll((prev) => [...prev.filter((i) => i.group !== group), ...reordered]);

    startTransition(async () => {
      const result = await reorderNavItems(reordered.map((i) => i.id));
      if (!result.ok) {
        setAll(items);
        toast.error(result.message);
      }
    });
  }

  function remove(item: AdminNavItem) {
    startTransition(async () => {
      const result = await deleteNavItem(item.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`“${item.label}” removed from the menu.`);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <NavForm
        item={"id" in editing ? editing : null}
        group={editing.group}
        targets={targets}
        onDone={() => {
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {GROUPS.map(({ key, title, hint }) => {
        const inGroup = all
          .filter((i) => i.group === key)
          .sort((a, b) => a.position - b.position);

        return (
          <Card key={key}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <div>
                <h2 className="text-[14px] font-semibold">{title}</h2>
                <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing({ group: key })}
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium hover:border-ink"
              >
                Add link
              </button>
            </div>

            {inGroup.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
                No links in this menu.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {inGroup.map((item, i) => (
                  <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => move(key, i, -1)}
                        disabled={i === 0 || pending}
                        aria-label={`Move ${item.label} up`}
                        className="inline-flex size-6 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(key, i, 1)}
                        disabled={i === inGroup.length - 1 || pending}
                        aria-label={`Move ${item.label} down`}
                        className="inline-flex size-6 items-center justify-center rounded-[var(--radius-xs)] text-ink-muted hover:bg-muted disabled:opacity-25"
                      >
                        ↓
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13.5px] font-medium">{item.label}</p>
                        {item.highlight ? <Pill tone="warn">Highlighted</Pill> : null}
                        {!item.isActive ? <Pill tone="off">Hidden</Pill> : null}
                      </div>
                      <p className="truncate font-mono text-[11.5px] text-ink-muted">
                        {item.href}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] border border-line-strong px-2.5 text-[12.5px] font-medium hover:border-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={pending}
                      className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] px-2 text-[12.5px] font-medium text-ink-muted hover:text-sale disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function NavForm({
  item,
  group,
  targets,
  onDone,
  onCancel,
}: {
  item: AdminNavItem | null;
  group: AdminNavItem["group"];
  targets: { href: string; label: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: item?.label ?? "",
    href: item?.href ?? targets[0]?.href ?? "/",
    highlight: item?.highlight ?? false,
    isActive: item?.isActive ?? true,
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await saveNavItem({ id: item?.id, group, ...form });
      if (!result.ok) {
        setFailure(result.message);
        return;
      }
      toast.success(item ? "Link saved." : "Link added.");
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl">
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">
          {item ? `Edit “${item.label}”` : "New link"}
        </h2>

        {failure ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-3.5 py-2.5 text-[13px] text-sale"
          >
            {failure}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <Field label="What it says" id="nav-label" required>
            <input
              id="nav-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className={inputClass()}
            />
          </Field>

          <Field
            label="Where it goes"
            id="nav-href"
            required
            hint="Only pages that exist. That is the point — a menu link to a page you renamed is a dead end nobody reports."
          >
            <select
              id="nav-href"
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              className={inputClass()}
            >
              {targets.map((t) => (
                <option key={t.href} value={t.href}>
                  {t.label} — {t.href}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-start gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={form.highlight}
              onChange={(e) => setForm({ ...form, highlight: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
            />
            <span>
              Highlight it
              <span className="mt-0.5 block text-[12px] text-ink-muted">
                Shows in the sale colour. Used for “Offers”. One highlighted
                link draws the eye; three draw none.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
            />
            <span>Show in the menu</span>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : item ? "Save link" : "Add link"}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] px-3 text-[14px] font-medium text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </Card>
    </form>
  );
}
