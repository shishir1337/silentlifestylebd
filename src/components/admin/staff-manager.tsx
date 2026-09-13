"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Card, Pill } from "./admin-ui";
import { useToast } from "./toast";
import { setStaffRole, revokeStaff } from "@/lib/admin/staff-actions";
import type { StaffMember } from "@/lib/admin/staff-reads";
import { cn } from "@/lib/cn";

/**
 * The staff list.
 *
 * What each role can do is written next to the choice rather than in a help
 * page. The person granting access is deciding how much of their shop to hand
 * over, and "Manager" means nothing on its own.
 *
 * Removing access asks first. It is not destructive — the account and its
 * order history survive — but it locks somebody out mid-shift, and that is
 * worth a second of thought.
 */

const ROLES: { value: StaffRole; label: string; can: string }[] = [
  {
    value: "STAFF",
    label: "Staff",
    can: "Orders only. Cannot change prices, products or settings.",
  },
  {
    value: "MANAGER",
    label: "Manager",
    can: "Orders, products, categories and everything under Content.",
  },
  {
    value: "OWNER",
    label: "Owner",
    can: "Everything, including settings and who else gets in.",
  },
];

const ROLE_TONE: Record<StaffRole, "on" | "warn" | "off"> = {
  OWNER: "warn",
  MANAGER: "on",
  STAFF: "off",
};

export function StaffManager({
  staff,
  currentUserId,
}: {
  staff: StaffMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("STAFF");

  function run(work: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setFailure(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setFailure(result.message ?? "That did not work.");
        return;
      }
      setConfirming(null);
      toast.success(done);
      router.refresh();
    });
  }

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

      <ul className="space-y-2">
        {staff.map((member) => {
          const isYou = member.id === currentUserId;
          return (
            <li key={member.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium">{member.name}</p>
                      <Pill tone={ROLE_TONE[member.role]}>
                        {ROLES.find((r) => r.value === member.role)?.label ?? member.role}
                      </Pill>
                      {isYou ? <Pill tone="off">You</Pill> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                      {member.email}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-muted">
                      {member.lastSeen
                        ? `Last signed in ${new Date(member.lastSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Has never signed in"}
                    </p>
                  </div>

                  {isYou ? (
                    <p className="max-w-[220px] text-[12px] text-ink-muted">
                      Another owner has to change your own access.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor={`role-${member.id}`} className="sr-only">
                        Role for {member.name}
                      </label>
                      <select
                        id={`role-${member.id}`}
                        value={member.role}
                        disabled={pending}
                        onChange={(e) =>
                          run(
                            () =>
                              setStaffRole({
                                email: member.email,
                                role: e.target.value as StaffRole,
                              }),
                            `${member.name} is now ${e.target.selectedOptions[0].text}.`,
                          )
                        }
                        className={cn(inputClass(), "h-9 w-auto py-0 text-[13px]")}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirming(member.id)}
                        className="inline-flex h-9 items-center rounded-[var(--radius-sm)] px-2.5 text-[12.5px] font-medium text-ink-muted hover:text-sale"
                      >
                        Remove access
                      </button>
                    </div>
                  )}
                </div>

                {confirming === member.id ? (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-sale/40 bg-sale/5 p-3">
                    <p className="text-[13px]">
                      Remove {member.name}&apos;s access to the admin panel? They
                      will be signed out of it on their next click. Their
                      customer account and any orders they placed stay.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => revokeStaff(member.id),
                            `${member.name} no longer has admin access.`,
                          )
                        }
                      >
                        {pending ? "Removing…" : "Remove access"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-line-strong px-3 text-[13px] font-medium"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>

      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Give someone access</h2>
        <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-ink-muted">
          They need an account on the shop first — ask them to sign up at{" "}
          <span className="font-medium">/signup</span> with the email address
          you type here. There is no invitation link, because a link that hands
          out admin access is a link that can be forwarded.
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setStaffRole({ email, role }), `${email} can now sign in to the admin.`);
            setEmail("");
          }}
        >
          <Field label="Their email address" id="staff-email" required>
            <input
              id="staff-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={inputClass()}
            />
          </Field>

          <fieldset>
            <legend className="text-[13px] font-medium">What they can do</legend>
            <div className="mt-2 space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] border p-3 transition-colors duration-[var(--dur-base)]",
                    role === r.value ? "border-ink bg-muted" : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="staff-role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
                  />
                  <span>
                    <span className="text-[13.5px] font-medium">{r.label}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-muted">
                      {r.can}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" disabled={pending || !email.trim()}>
            {pending ? "Adding…" : "Give access"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
