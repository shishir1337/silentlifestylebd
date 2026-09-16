"use server";

import { revalidatePath } from "next/cache";
import type { StaffRole } from "@prisma/client";
import { db } from "@/lib/db";
import { assertStaffAccess } from "@/lib/admin/access";
import { recordAudit } from "@/lib/admin/audit";
import type { SaveResult } from "@/lib/admin/catalog-types";

/**
 * Granting and revoking admin access.
 *
 * This replaces `pnpm admin:grant` for everyone but the very first owner, who
 * still has to come from the command line — an admin panel that can create its
 * own first administrator is a public page that creates administrators.
 *
 * Roles are granted to accounts that already exist. There is no invitation
 * email, and deliberately so: an invite link that creates an account with
 * admin rights is a credential sitting in an inbox, and this shop has no
 * mail-delivery guarantees to hang that on. The person signs up like any
 * customer and is then given a role — one extra step, and nothing that grants
 * access can be forwarded.
 *
 * The guard rail that does the work is that nobody can change their own role.
 * Since only owners reach this page, an owner who is the only owner is also
 * the only person who could demote themselves — so refusing self-changes is
 * what keeps the shop from ending up with nobody who can manage it.
 *
 * `wouldStrandTheShop` is the second line: today it cannot fire, because the
 * self-check catches that case first. It is here for the day someone widens
 * `CAN_MANAGE_STAFF` beyond owners, which is exactly the change that would
 * quietly remove the only protection.
 */

const ROLES: StaffRole[] = ["OWNER", "MANAGER", "STAFF"];

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

/**
 * Would this leave the shop with no owner?
 *
 * Counted from the database rather than from the list the page rendered. That
 * list may be minutes old, and in those minutes the other owner may have gone.
 *
 * It does not need to know who is being changed, which looks like an oversight
 * and is not: the first line means this only runs when the person in question
 * is an owner right now and is about to stop being one. If the count is one,
 * that one is them.
 */
async function wouldStrandTheShop(
  currentRole: StaffRole | null,
  nextRole: StaffRole | null,
): Promise<string | null> {
  if (currentRole !== "OWNER" || nextRole === "OWNER") return null;

  const owners = await db.user.count({ where: { staffRole: "OWNER" } });
  if (owners <= 1) {
    return "This is the only owner. Make someone else an owner first, or there will be nobody who can manage staff and settings.";
  }
  return null;
}

export async function setStaffRole(input: {
  email: string;
  role: StaffRole;
}): Promise<SaveResult> {
  const actor = await assertStaffAccess();

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, message: "Enter the person's email address." };
  if (!ROLES.includes(input.role)) return { ok: false, message: "Unknown role." };

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, staffRole: true },
  });

  if (!user) {
    return {
      ok: false,
      message: `No account for ${email}. Ask them to sign up on the shop first, then add them here.`,
    };
  }

  if (user.id === actor.id) {
    return {
      ok: false,
      message: "You cannot change your own role. Ask another owner to do it.",
    };
  }

  const stranded = await wouldStrandTheShop(user.staffRole, input.role);
  if (stranded) return { ok: false, message: stranded };

  if (user.staffRole === input.role) return { ok: true, id: user.id };

  await db.user.update({ where: { id: user.id }, data: { staffRole: input.role } });

  const was = user.staffRole;
  await recordAudit(
    actor,
    was ? "staff.changed" : "staff.granted",
    user.id,
    was
      ? `${user.name || user.email} changed from ${ROLE_LABEL[was]} to ${ROLE_LABEL[input.role]}`
      : `${user.name || user.email} given ${ROLE_LABEL[input.role]} access`,
  );

  revalidatePath("/admin/staff");
  return { ok: true, id: user.id };
}

export async function revokeStaff(userId: string): Promise<SaveResult> {
  const actor = await assertStaffAccess();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, staffRole: true },
  });

  if (!user?.staffRole) {
    return { ok: false, message: "That account no longer has admin access." };
  }

  if (user.id === actor.id) {
    return {
      ok: false,
      message: "You cannot remove your own access. Ask another owner to do it.",
    };
  }

  const stranded = await wouldStrandTheShop(user.staffRole, null);
  if (stranded) return { ok: false, message: stranded };

  /*
    The role goes; the account stays. They may well be a customer too, and
    deleting the account would take their order history with it. Sessions are
    not cleared either — the role is read from the database on every request,
    so the next thing they click is already refused.
  */
  await db.user.update({ where: { id: user.id }, data: { staffRole: null } });

  await recordAudit(
    actor,
    "staff.revoked",
    user.id,
    `${user.name || user.email} (${ROLE_LABEL[user.staffRole]}) lost admin access`,
  );

  revalidatePath("/admin/staff");
  return { ok: true, id: user.id };
}
