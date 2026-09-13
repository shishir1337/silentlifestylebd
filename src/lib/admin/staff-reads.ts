import "server-only";

import type { StaffRole } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Who can get into the admin panel.
 *
 * Everyone with a non-null `staffRole`, plus enough about each to answer the
 * question the owner actually has when they open this page: is this account
 * still in use, and should it still be able to do that.
 */

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  createdAt: string;
  /** When they last signed in, from their newest live session. */
  lastSeen: string | null;
}

export async function listStaff(): Promise<StaffMember[]> {
  const rows = await db.user.findMany({
    where: { staffRole: { not: null } },
    orderBy: [{ staffRole: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      staffRole: true,
      createdAt: true,
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { updatedAt: true },
      },
    },
  });

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.staffRole!,
    createdAt: u.createdAt.toISOString(),
    lastSeen: u.sessions[0]?.updatedAt.toISOString() ?? null,
  }));
}

/** How many owners there are — the number the last-owner guard rail reads. */
export async function countOwners(): Promise<number> {
  return db.user.count({ where: { staffRole: "OWNER" } });
}
