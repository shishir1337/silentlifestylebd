-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stockRestored" BOOLEAN NOT NULL DEFAULT false;

-- Orders already in a restocking status had their stock put back under the old
-- one-way rules, so the flag has to say so. Without this backfill, reinstating
-- one of them would take the goods a second time.
UPDATE "Order" SET "stockRestored" = true WHERE "status" IN ('CANCELLED', 'RETURNED');
