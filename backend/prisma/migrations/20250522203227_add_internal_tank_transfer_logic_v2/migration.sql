/*
  Warnings:

  - You are about to drop the column `identifier` on the `FixedStorageTanks` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `FixedStorageTanks` table. All the data in the column will be lost.
  - You are about to drop the column `fixed_storage_tank_id` on the `FixedTankTransfers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tank_name]` on the table `FixedStorageTanks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tank_identifier]` on the table `FixedStorageTanks` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tank_name` to the `FixedStorageTanks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `activity_type` to the `FixedTankTransfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `affected_fixed_tank_id` to the `FixedTankTransfers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FixedTankActivityType" AS ENUM ('INTAKE', 'INTERNAL_TRANSFER_OUT', 'INTERNAL_TRANSFER_IN', 'FUEL_DRAIN');

-- Step 1: Add new columns to FixedStorageTanks as nullable
ALTER TABLE "FixedStorageTanks"
ADD COLUMN     "tank_name" TEXT,
ADD COLUMN     "tank_identifier" TEXT,
ADD COLUMN     "last_checked_date" TIMESTAMP(3),
ADD COLUMN     "last_cleaned_date" TIMESTAMP(3),
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "serial_number" TEXT,
ADD COLUMN     "year_of_manufacture" INTEGER;

-- Step 2: Populate new columns in FixedStorageTanks from old columns
UPDATE "FixedStorageTanks" SET "tank_name" = "name", "tank_identifier" = "identifier";

-- Step 3: Alter tank_name to be NOT NULL
ALTER TABLE "FixedStorageTanks" ALTER COLUMN "tank_name" SET NOT NULL;
-- Note: tank_identifier remains nullable as per schema

-- Step 4: Create unique constraints for FixedStorageTanks
-- Drop old unique index on identifier if it wasn't dropped by Prisma (Prisma's original migration.sql already handles dropping it)
-- DROP INDEX IF EXISTS "FixedStorageTanks_identifier_key"; 
CREATE UNIQUE INDEX "FixedStorageTanks_tank_name_key" ON "FixedStorageTanks"("tank_name");
CREATE UNIQUE INDEX "FixedStorageTanks_tank_identifier_key" ON "FixedStorageTanks"("tank_identifier");

-- Step 5: Drop old columns from FixedStorageTanks
ALTER TABLE "FixedStorageTanks"
DROP COLUMN "identifier",
DROP COLUMN "name";

-- Step 6: Prepare FixedTankTransfers for changes
-- DropForeignKey and Index for old fixed_storage_tank_id (Prisma's original migration.sql already handles these)
-- ALTER TABLE "FixedTankTransfers" DROP CONSTRAINT IF EXISTS "FixedTankTransfers_fixed_storage_tank_id_fkey";
-- DROP INDEX IF EXISTS "FixedTankTransfers_fixed_storage_tank_id_idx";

-- Step 7: Add new columns to FixedTankTransfers as nullable
ALTER TABLE "FixedTankTransfers"
ADD COLUMN     "activity_type" "FixedTankActivityType",
ADD COLUMN     "affected_fixed_tank_id" INTEGER,
ADD COLUMN     "counterparty_fixed_tank_id" INTEGER,
ADD COLUMN     "internal_transfer_pair_id" UUID;

-- Step 8: Populate new columns in FixedTankTransfers
-- We need to ensure fixed_storage_tank_id exists before trying to read from it.
-- Prisma's original migration drops it early. We will populate first, then drop.
UPDATE "FixedTankTransfers" SET
"activity_type" = 'INTAKE',
"affected_fixed_tank_id" = "fixed_storage_tank_id";

-- Step 9: Alter new columns in FixedTankTransfers to be NOT NULL
ALTER TABLE "FixedTankTransfers" ALTER COLUMN "activity_type" SET NOT NULL;
ALTER TABLE "FixedTankTransfers" ALTER COLUMN "affected_fixed_tank_id" SET NOT NULL;

-- Step 10: Make fuel_intake_record_id nullable (Prisma's original migration.sql handles this)
ALTER TABLE "FixedTankTransfers" ALTER COLUMN "fuel_intake_record_id" DROP NOT NULL;

-- Step 11: Drop old column from FixedTankTransfers
ALTER TABLE "FixedTankTransfers" DROP COLUMN "fixed_storage_tank_id";

-- Step 12: Create new indexes for FixedTankTransfers
CREATE INDEX "FixedTankTransfers_affected_fixed_tank_id_idx" ON "FixedTankTransfers"("affected_fixed_tank_id");
CREATE INDEX "FixedTankTransfers_counterparty_fixed_tank_id_idx" ON "FixedTankTransfers"("counterparty_fixed_tank_id");
CREATE INDEX "FixedTankTransfers_internal_transfer_pair_id_idx" ON "FixedTankTransfers"("internal_transfer_pair_id");

-- Step 13: Add new foreign keys for FixedTankTransfers
ALTER TABLE "FixedTankTransfers" ADD CONSTRAINT "FixedTankTransfers_affected_fixed_tank_id_fkey" FOREIGN KEY ("affected_fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedTankTransfers" ADD CONSTRAINT "FixedTankTransfers_counterparty_fixed_tank_id_fkey" FOREIGN KEY ("counterparty_fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
