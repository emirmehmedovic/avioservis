/*
  Warnings:

  - You are about to drop the column `fuelTransferToTankerId` on the `AttachedDocument` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `FuelTransferToTanker` table. All the data in the column will be lost.
  - You are about to drop the column `targetVehicleId` on the `FuelTransferToTanker` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FuelTransferToTanker` table. All the data in the column will be lost.
  - You are about to drop the column `current_fuel_liters` on the `Vehicle` table. All the data in the column will be lost.
  - Added the required column `targetFuelTankId` to the `FuelTransferToTanker` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AttachedDocument" DROP CONSTRAINT "AttachedDocument_fuelTransferToTankerId_fkey";

-- DropForeignKey
ALTER TABLE "FuelTransferToTanker" DROP CONSTRAINT "FuelTransferToTanker_targetVehicleId_fkey";

-- DropIndex
DROP INDEX "AttachedDocument_fuelTransferToTankerId_idx";

-- DropIndex
DROP INDEX "FuelTransferToTanker_targetVehicleId_idx";

-- AlterTable
ALTER TABLE "AttachedDocument" DROP COLUMN "fuelTransferToTankerId";

-- AlterTable
ALTER TABLE "FuelTank" ALTER COLUMN "current_liters" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "FuelTransferToTanker" DROP COLUMN "createdAt",
DROP COLUMN "targetVehicleId",
DROP COLUMN "updatedAt",
ADD COLUMN     "targetFuelTankId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "current_fuel_liters";

-- CreateIndex
CREATE INDEX "FuelTransferToTanker_targetFuelTankId_idx" ON "FuelTransferToTanker"("targetFuelTankId");

-- AddForeignKey
ALTER TABLE "FuelTransferToTanker" ADD CONSTRAINT "FuelTransferToTanker_targetFuelTankId_fkey" FOREIGN KEY ("targetFuelTankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
