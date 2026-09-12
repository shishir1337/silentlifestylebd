"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertUser, getSession } from "@/lib/dal";
import { isBDMobile, normalisePhone } from "@/lib/phone";
import type { Address, AccountSnapshot, Profile } from "@/lib/account-types";
import type { DeliveryArea as StorefrontArea } from "@/lib/orders";
import { DeliveryArea } from "@prisma/client";

/**
 * Server Actions for the customer's own profile and address book.
 *
 * Every one of these authenticates itself. Not because the pages that call
 * them are unprotected — they are — but because a Server Action is a POST to
 * whatever route it happens to be used from, so route-level protection is a
 * property of where it is called, not of the action. Move a call and the
 * protection moves with the page, not with the action.
 *
 * Ownership is enforced in the `where` clause rather than by comparing after
 * the read: `findUnique({ id })` then `if (row.userId !== me)` leaks whether
 * an id exists, and is one early return away from not leaking anything at all.
 */

const toStorefrontArea = (a: DeliveryArea): StorefrontArea =>
  a === DeliveryArea.INSIDE_DHAKA ? "inside-dhaka" : "outside-dhaka";

const toPrismaArea = (a: StorefrontArea): DeliveryArea =>
  a === "inside-dhaka" ? DeliveryArea.INSIDE_DHAKA : DeliveryArea.OUTSIDE_DHAKA;

/**
 * Everything the account context needs, in one round trip.
 *
 * Guests get `signedIn: false` and nothing else — the client then reads its
 * own localStorage, exactly as it did before accounts existed. Guest checkout
 * must keep working with no server state whatsoever.
 */
export async function loadAccount(): Promise<AccountSnapshot> {
  const session = await getSession();
  if (!session) return { signedIn: false, profile: null, addresses: [] };

  const [user, rows] = await Promise.all([
    db.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true, phone: true, altPhone: true },
    }),
    db.customerAddress.findMany({
      where: { userId: session.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    signedIn: true,
    profile: {
      name: user?.name ?? session.name,
      email: user?.email ?? session.email,
      phone: user?.phone ?? "",
      altPhone: user?.altPhone ?? "",
    },
    addresses: rows.map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      address: a.address,
      area: toStorefrontArea(a.area),
      isDefault: a.isDefault,
    })),
  };
}

export async function saveProfile(input: Profile): Promise<Profile> {
  const session = await assertUser();

  const name = input.name.trim();
  const phone = normalisePhone(input.phone).trim();
  const altPhone = normalisePhone(input.altPhone).trim();

  // Re-validated here, not just in the form. The form's validation is a
  // courtesy to the customer; this is the one that decides what gets stored.
  if (name.length < 3) throw new Error("Enter your full name.");
  if (phone && !isBDMobile(phone)) throw new Error("Enter a valid mobile number.");
  if (altPhone && !isBDMobile(altPhone)) {
    throw new Error("Enter a valid alternative number.");
  }

  const user = await db.user.update({
    where: { id: session.id },
    // `email` is deliberately absent. It is the sign-in identifier, so changing
    // it is an authentication operation that needs to prove the new address is
    // reachable — not a field on a details form.
    data: { name, phone: phone || null, altPhone: altPhone || null },
    select: { name: true, email: true, phone: true, altPhone: true },
  });

  revalidatePath("/account");
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    altPhone: user.altPhone ?? "",
  };
}

export async function saveAddress(input: Address): Promise<Address[]> {
  const session = await assertUser();

  const data = {
    label: input.label.trim() || "Home",
    recipient: input.recipient.trim(),
    phone: normalisePhone(input.phone),
    address: input.address.trim(),
    area: toPrismaArea(input.area),
  };

  if (data.recipient.length < 3) throw new Error("Enter who should receive it.");
  if (!isBDMobile(data.phone)) throw new Error("Enter a valid mobile number.");
  if (data.address.length < 10) throw new Error("Enter the full address.");

  /**
   * One transaction, because "exactly one default" is a rule about the whole
   * set, not about one row. Postgres enforces *at most* one with a partial
   * unique index; clearing the old default and setting the new one has to
   * happen together or that index rejects the write halfway through.
   */
  await db.$transaction(async (tx) => {
    const count = await tx.customerAddress.count({ where: { userId: session.id } });
    // The first address a customer saves is their default whether they said so
    // or not — an address book with no default helps nobody at checkout.
    const isDefault = input.isDefault || count === 0;

    if (isDefault) {
      await tx.customerAddress.updateMany({
        where: { userId: session.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // `id` is only trusted as a filter alongside `userId`, never on its own.
    const existing = input.id
      ? await tx.customerAddress.findFirst({
          where: { id: input.id, userId: session.id },
          select: { id: true },
        })
      : null;

    if (existing) {
      await tx.customerAddress.update({
        where: { id: existing.id },
        data: { ...data, isDefault },
      });
    } else {
      await tx.customerAddress.create({
        data: { ...data, isDefault, userId: session.id },
      });
    }
  });

  revalidatePath("/account/addresses");
  return listAddresses(session.id);
}

export async function deleteAddress(id: string): Promise<Address[]> {
  const session = await assertUser();

  await db.$transaction(async (tx) => {
    // deleteMany with both columns: an id belonging to someone else matches
    // nothing and deletes nothing, with no error that confirms it exists.
    const { count } = await tx.customerAddress.deleteMany({
      where: { id, userId: session.id },
    });
    if (count === 0) return;

    // Deleting the default promotes the oldest survivor rather than leaving a
    // customer with addresses and nothing for checkout to prefill.
    const remaining = await tx.customerAddress.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, isDefault: true },
    });
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      await tx.customerAddress.update({
        where: { id: remaining[0].id },
        data: { isDefault: true },
      });
    }
  });

  revalidatePath("/account/addresses");
  return listAddresses(session.id);
}

export async function makeAddressDefault(id: string): Promise<Address[]> {
  const session = await assertUser();

  await db.$transaction(async (tx) => {
    const mine = await tx.customerAddress.findFirst({
      where: { id, userId: session.id },
      select: { id: true },
    });
    if (!mine) return;

    await tx.customerAddress.updateMany({
      where: { userId: session.id, isDefault: true },
      data: { isDefault: false },
    });
    await tx.customerAddress.update({
      where: { id: mine.id },
      data: { isDefault: true },
    });
  });

  revalidatePath("/account/addresses");
  return listAddresses(session.id);
}

/** Internal: the caller has already proven who it is. */
async function listAddresses(userId: string): Promise<Address[]> {
  const rows = await db.customerAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((a) => ({
    id: a.id,
    label: a.label,
    recipient: a.recipient,
    phone: a.phone,
    address: a.address,
    area: toStorefrontArea(a.area),
    isDefault: a.isDefault,
  }));
}
