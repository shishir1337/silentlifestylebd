-- Enforce "at most one default address per customer" in the database.
--
-- The storefront enforces this in the browser today (src/lib/account.ts), which
-- is fine for UX but is not a guarantee: two tabs, a retried Server Action, or
-- any future admin tool could leave a customer with two defaults, and checkout
-- would then silently pick whichever row came back first.
--
-- Prisma's schema language cannot express a partial unique index, so it is
-- declared here as raw SQL. Postgres enforces uniqueness only across rows where
-- isDefault is true, which is exactly the invariant — a customer may hold many
-- addresses, but no more than one of them is the default.
--
-- "At most one" rather than "exactly one" is deliberate: a customer with zero
-- addresses must remain valid, and promoting a replacement when the default is
-- deleted is application logic, not a constraint.

CREATE UNIQUE INDEX "CustomerAddress_one_default_per_user"
  ON "CustomerAddress" ("userId")
  WHERE "isDefault";
