"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card } from "./admin-ui";
import { useToast } from "./toast";
import { saveSettings, verifyMetaCapiToken } from "@/lib/admin/settings-actions";
import type { SettingGroup } from "@/lib/admin/settings-reads";
import { cn } from "@/lib/cn";

/**
 * One form for all the settings, shown a section at a time.
 *
 * Still one form and one save button: a shop owner changing their phone number
 * usually changes the WhatsApp number in the same sitting, and a delivery rate
 * rise usually moves the free threshold with it. Three separate save buttons
 * would let them walk away having saved one of the two.
 *
 * The tabs are client state, not links. Switching one keeps whatever has been
 * typed on the others — a tab that loses an edit is worse than the long page
 * it replaced — and the counter at the bottom counts every unsaved change on
 * every tab, with a nudge to the ones not currently on screen.
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
  const [tab, setTab] = useState(groups[0]?.id ?? "");

  /*
    A saved secret arrives as an empty string — the server never sends the real
    one. So an empty box means "leave it alone", and there has to be some other
    way to say "take it away". This is it, and it is a checkbox rather than a
    button because it belongs to the same save as everything else: tick it,
    look at what you are about to do, and save once.
  */
  const [clearing, setClearing] = useState<Record<string, boolean>>({});
  const secretKeys = new Set(
    groups.flatMap((g) => g.settings.filter((s) => s.type === "SECRET").map((s) => s.key)),
  );
  const isDirty = (key: string) => values[key] !== saved[key] || clearing[key] === true;

  const dirty = Object.keys(saved).filter(isDirty);
  const dirtyIn = (g: SettingGroup) => g.settings.filter((s) => isDirty(s.key)).length;
  const elsewhere =
    dirty.length - (groups.find((g) => g.id === tab)?.settings.filter((s) => isDirty(s.key)).length ?? 0);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    startTransition(async () => {
      /*
        An untouched secret is left out of the payload entirely, so the action
        keeps what it has. Sending the empty string the form is holding would
        wipe a working token the moment anybody saved a delivery charge.
      */
      const payload = { ...values };
      for (const key of secretKeys) {
        if (!values[key] && !clearing[key]) delete payload[key];
      }
      const result = await saveSettings(payload);
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
      // Back to "a token is saved, leave the box alone". `router.refresh()`
      // re-reads `hasValue`, which is the only thing that changed on screen.
      setClearing({});
      setValues((v) => {
        const next = { ...v };
        for (const key of secretKeys) next[key] = "";
        return next;
      });
      setSaved((v) => {
        const next = { ...v };
        for (const key of secretKeys) next[key] = "";
        return next;
      });
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

      {/*
        A tab list, not links: these are sections of one form, and a router
        navigation would throw away anything typed but not yet saved.
      */}
      <div role="tablist" aria-label="Settings sections" className="border-b border-line">
        <ul className="rail rail-bleed -mb-px gap-1 sm:flex sm:overflow-visible">
          {groups.map((g) => {
            const n = dirtyIn(g);
            const active = g.id === tab;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  role="tab"
                  id={`tab-${g.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${g.id}`}
                  onClick={() => setTab(g.id)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13.5px] font-medium whitespace-nowrap",
                    "transition-colors duration-[var(--dur-base)]",
                    active
                      ? "border-ink text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {g.title}
                  {n > 0 ? (
                    <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-on-brand">
                      {n}
                      {/*
                        A bare `<span>` has no role, so an `aria-label` on it
                        is ignored — this badge used to carry one and announced
                        nothing at all. The count is the only thing telling
                        somebody they have unsaved changes on a tab they cannot
                        see, so the words go in the tree as text instead.
                      */}
                      <span className="sr-only"> unsaved</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {groups.map((group) => (
        <Card
          key={group.id}
          role="tabpanel"
          id={`panel-${group.id}`}
          aria-labelledby={`tab-${group.id}`}
          hidden={group.id !== tab}
          className="p-5"
        >
          <h2 className="text-[15px] font-semibold">{group.title}</h2>
          {group.lead ? (
            <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
              {group.lead}
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            {group.settings.map((s) => {
              const changed = isDirty(s.key);

              /*
                A secret. The box is always empty, because the server never
                sent the value — so "empty" has to mean "unchanged" and the
                checkbox underneath is the only way to say "remove it".

                `type="password"` and `autoComplete="off"` keep the browser
                from offering to remember a shop's access token as if it were
                somebody's login.
              */
              if (s.type === "SECRET") {
                return (
                  <div key={s.key}>
                    <Field
                      label={s.label}
                      id={`set-${s.key}`}
                      hint={s.helpText ?? undefined}
                    >
                      <input
                        id={`set-${s.key}`}
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        value={values[s.key]}
                        disabled={clearing[s.key] === true}
                        placeholder={
                          s.hasValue
                            ? "A token is saved. Leave this blank to keep it."
                            : "Paste the token"
                        }
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [s.key]: e.target.value }))
                        }
                        className={cn(
                          inputClass(),
                          changed && "border-brand",
                          clearing[s.key] && "opacity-50",
                        )}
                      />
                    </Field>

                    {s.hasValue ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
                          <input
                            type="checkbox"
                            checked={clearing[s.key] === true}
                            onChange={(e) =>
                              setClearing((c) => ({ ...c, [s.key]: e.target.checked }))
                            }
                            className="size-4 accent-[var(--color-ink)]"
                          />
                          Remove the saved token when I save
                        </label>

                        {s.key === "tracking.metaCapiToken" ? (
                          <CheckTokenButton />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              }

              /*
                A fixed set of answers gets a fixed set of buttons.

                `Field` labels a single control, and a radio group is several,
                so this branch draws its own <fieldset>/<legend> rather than
                borrowing a <label> that would point at only the first option.
                Each choice carries the sentence explaining what it does: the
                one place this matters is the double-counting switch, and the
                consequence of getting it wrong is invisible until an ad budget
                has been spent against it.
              */
              if (s.choices) {
                return (
                  <fieldset key={s.key}>
                    <legend className="text-[13px] font-medium">{s.label}</legend>
                    {s.helpText ? (
                      <p className="mt-1 max-w-prose text-[12px] leading-relaxed text-ink-muted">
                        {s.helpText}
                      </p>
                    ) : null}
                    <div className="mt-2 space-y-2">
                      {s.choices.map((c) => {
                        const on = values[s.key] === c.value;
                        return (
                          <label
                            key={c.value}
                            className={cn(
                              "flex cursor-pointer gap-3 rounded-[var(--radius-sm)] border p-3",
                              "transition-colors duration-[var(--dur-base)]",
                              on
                                ? "border-ink bg-subtle"
                                : "border-line hover:border-line-strong",
                              changed && on && "border-brand",
                            )}
                          >
                            <input
                              type="radio"
                              name={`set-${s.key}`}
                              value={c.value}
                              checked={on}
                              onChange={() =>
                                setValues((v) => ({ ...v, [s.key]: c.value }))
                              }
                              className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
                            />
                            <span className="min-w-0">
                              <span className="block text-[13.5px] font-medium">
                                {c.label}
                              </span>
                              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">
                                {c.hint}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              }

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
            : `${dirty.length} ${dirty.length === 1 ? "change" : "changes"} not saved yet` +
              (elsewhere > 0 ? `, ${elsewhere} on another tab.` : ".")}
        </p>
      </div>
    </form>
  );
}

/**
 * "Does this token work?", asked of Meta rather than of the shop owner.
 *
 * The only setting on this panel whose correctness is invisible. A wrong
 * delivery charge shows up in the next order; a dead Conversions API token
 * looks exactly like a working one until somebody notices that Meta has been
 * recording fewer sales than the shop has.
 *
 * It checks the token that is *saved*, not the one in the box above — there is
 * no point reporting on something the shop is not using yet. Nothing is sent
 * to Meta but a question about the dataset's name.
 */
function CheckTokenButton() {
  const [checking, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={checking}
        onClick={() =>
          start(async () => {
            setResult(null);
            setResult(await verifyMetaCapiToken());
          })
        }
        className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[12.5px] font-medium transition-colors duration-[var(--dur-base)] hover:border-ink disabled:opacity-50"
      >
        {checking ? "Asking Meta…" : "Check the saved token"}
      </button>

      {result ? (
        <p
          // `polite`, not `alert`: this is an answer to something the person
          // just clicked, not an interruption.
          aria-live="polite"
          className={cn(
            "basis-full text-[12.5px] leading-relaxed",
            result.ok ? "text-brand" : "text-sale",
          )}
        >
          {result.message}
        </p>
      ) : null}
    </>
  );
}
