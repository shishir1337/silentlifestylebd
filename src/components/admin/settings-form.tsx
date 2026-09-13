"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card } from "./admin-ui";
import { useToast } from "./toast";
import { saveSettings } from "@/lib/admin/settings-actions";
import type { SettingGroup } from "@/lib/admin/settings-reads";
import { cn } from "@/lib/cn";

/**
 * One form for all the settings, not one per group.
 *
 * A shop owner changing their phone number usually changes the WhatsApp
 * number in the same sitting, and a delivery rate rise usually moves the free
 * threshold with it. Three separate save buttons would let them walk away
 * having saved one of the two.
 *
 * The save button stays out of the way until something is actually different.
 * These are the numbers that decide what customers pay, and a form that looks
 * the same whether or not it has been touched invites a stray keystroke to be
 * published without anyone noticing.
 */
export function SettingsForm({ groups }: { groups: SettingGroup[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  const fromServer = () =>
    Object.fromEntries(groups.flatMap((g) => g.settings.map((s) => [s.key, s.value])));

  // Two copies: what the server last confirmed, and what is on screen. The
  // difference between them is what "unsaved" means, and it is the only thing
  // the save button reads.
  const [saved, setSaved] = useState<Record<string, string>>(fromServer);
  const [values, setValues] = useState<Record<string, string>>(fromServer);

  const dirty = Object.keys(saved).filter((k) => values[k] !== saved[k]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await saveSettings(values);
      if (!result.ok) {
        setFailure(result.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(
        dirty.length === 1
          ? "Saved. The shop is showing the new value."
          : `${dirty.length} settings saved. The shop is showing them.`,
      );
      setSaved(values);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-5 pb-2">
      {failure ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 px-4 py-3 text-[14px] text-sale"
        >
          {failure}
        </p>
      ) : null}

      {groups.map((group) => (
        <Card key={group.id} className="p-5">
          <h2 className="text-[15px] font-semibold">{group.title}</h2>
          {group.lead ? (
            <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
              {group.lead}
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            {group.settings.map((s) => {
              const changed = values[s.key] !== saved[s.key];
              return (
                <Field
                  key={s.key}
                  label={s.label}
                  id={`set-${s.key}`}
                  hint={s.helpText ?? undefined}
                >
                  {s.type === "TEXT" ? (
                    <textarea
                      id={`set-${s.key}`}
                      rows={3}
                      value={values[s.key]}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [s.key]: e.target.value }))
                      }
                      className={cn(
                        inputClass(),
                        "h-auto py-2.5",
                        changed && "border-brand",
                      )}
                    />
                  ) : (
                    <input
                      id={`set-${s.key}`}
                      value={values[s.key]}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [s.key]: e.target.value }))
                      }
                      inputMode={s.type === "INT" ? "numeric" : undefined}
                      className={cn(
                        inputClass(),
                        s.type === "INT" && "tabular max-w-[180px]",
                        changed && "border-brand",
                      )}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </Card>
      ))}

      {/*
        The bar only becomes sticky once something is unsaved. A permanently
        floating bar sits over the last field on a phone for the whole time
        the client is reading the page and has nothing to offer while it is
        there — the button is disabled anyway.
      */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          dirty.length > 0 &&
            "sticky bottom-0 z-10 -mx-4 border-t border-line bg-canvas px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgb(0_0_0/0.18)] sm:-mx-5 sm:px-5",
        )}
      >
        <Button type="submit" size="lg" disabled={pending || dirty.length === 0}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p aria-live="polite" className="text-[12.5px] text-ink-muted">
          {dirty.length === 0
            ? "Nothing changed yet."
            : `${dirty.length} ${dirty.length === 1 ? "change" : "changes"} not saved yet.`}
        </p>
      </div>
    </form>
  );
}
