/*
  Warnings:

  - You are about to drop the column `quantity_kg` on the `tank_reserve_fuel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tank_reserve_fuel" DROP COLUMN "quantity_kg";

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_tank_id_tank_type_idx" ON "tank_reserve_fuel"("tank_id", "tank_type");

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_source_mrn_idx" ON "tank_reserve_fuel"("source_mrn");

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_is_dispensed_idx" ON "tank_reserve_fuel"("is_dispensed");

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_created_at_idx" ON "tank_reserve_fuel"("created_at");
