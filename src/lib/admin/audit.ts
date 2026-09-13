import "server-only";

import { db } from "@/lib/db";
import type { StaffUser } from "@/lib/dal";

/**
 * The audit trail for everything that is not an order.
 *
 * Orders have `OrderEvent`, which earned its place the first time two people
 * disagreed about who cancelled one. Settings and staff roles need the same
 * answer to the same question — who changed this, and when — and they are the
 * two places where a wrong change is expensive: a delivery charge decides what
 * every customer pays, and a role decides who can change it.
 *
 * Writing is deliberately forgiving. An audit row is a record of something
 * that already happened; if the insert fails, the change it describes has
 * still been made, and throwing here would turn a logging problem into a
 * failed save the client has to puzzle over. It is logged to the server
 * console instead, where it is a bug to fix rather than a wall to hit.
 */

export type AuditAction =
  | "coupon.created"
  | "coupon.changed"
  | "coupon.deleted"
  | "settings.updated"
  | "staff.granted"
  | "staff.changed"
  | "staff.revoked";

export async function recordAudit(
  actor: StaffUser,
  action: AuditAction,
  subject: string,
  summary: string,
): Promise<void> {
  try {
    await db.auditEvent.create({
      data: {
        action,
        subject,
        summary,
        actorId: actor.id,
        actorName: actor.name || actor.email,
      },
    });
  } catch (error) {
    console.error("audit write failed", { action, subject, error });
  }
}

export interface AuditEntry {
  id: string;
  action: string;
  subject: string;
  summary: string;
  actorName: string;
  createdAt: string;
}

/** Newest first. The log is read, not searched — a shop this size never needs more. */
export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  const rows = await db.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    subject: r.subject,
    summary: r.summary,
    actorName: r.actorName,
    createdAt: r.createdAt.toISOString(),
  }));
}
