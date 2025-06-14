/*
  Warnings:

  - You are about to alter the column `quantity_liters_transferred` on the `FixedTankTransfers` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `quantity_kg_transferred` on the `FixedTankTransfers` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,3)`.
  - You are about to alter the column `quantityLiters` on the `FuelDrainRecord` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantityLiters` on the `FuelReceipt` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `capacity_liters` on the `FuelTank` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `current_liters` on the `FuelTank` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantity_liters` on the `FuelTankRefill` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantityLiters` on the `FuelTransferToTanker` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantity_liters` on the `FuelingOperation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to drop the column `supplier_name` on the `MobileTankCustoms` table. All the data in the column will be lost.
  - You are about to alter the column `quantity_liters` on the `MobileTankCustoms` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `remaining_quantity_liters` on the `MobileTankCustoms` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `quantity_liters` on the `TankFuelByCustoms` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `remaining_quantity_liters` on the `TankFuelByCustoms` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - You are about to alter the column `kapacitet_cisterne` on the `Vehicle` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,3)`.
  - Made the column `quantity_kg_transferred` on table `FixedTankTransfers` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `density_at_intake` to the `MobileTankCustoms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_kg` to the `MobileTankCustoms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remaining_quantity_kg` to the `MobileTankCustoms` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MobileTankCustoms" DROP CONSTRAINT "MobileTankCustoms_mobile_tank_id_fkey";

-- DropIndex
DROP INDEX "MobileTankCustoms_customs_declaration_number_idx";

-- DropIndex
DROP INDEX "MobileTankCustoms_date_added_idx";

-- DropIndex
DROP INDEX "MobileTankCustoms_mobile_tank_id_idx";

-- AlterTable
ALTER TABLE "FixedTankTransfers" ALTER COLUMN "quantity_liters_transferred" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "quantity_kg_transferred" SET NOT NULL,
ALTER COLUMN "quantity_kg_transferred" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "FuelDrainRecord" ALTER COLUMN "quantityLiters" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "FuelReceipt" ALTER COLUMN "quantityLiters" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "FuelTank" ALTER COLUMN "capacity_liters" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "current_liters" DROP DEFAULT,
ALTER COLUMN "current_liters" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "FuelTankRefill" ALTER COLUMN "quantity_liters" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "FuelTransferToTanker" ALTER COLUMN "quantityLiters" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "FuelingOperation" ALTER COLUMN "quantity_liters" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "MobileTankCustoms" DROP COLUMN "supplier_name",
ADD COLUMN     "density_at_intake" DECIMAL(8,4) NOT NULL,
ADD COLUMN     "quantity_kg" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "remaining_quantity_kg" DECIMAL(12,3) NOT NULL,
ALTER COLUMN "quantity_liters" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "date_added" DROP DEFAULT,
ALTER COLUMN "remaining_quantity_liters" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "TankFuelByCustoms" ADD COLUMN     "density_at_intake" DECIMAL(8,4),
ADD COLUMN     "quantity_kg" DECIMAL(12,3),
ADD COLUMN     "remaining_quantity_kg" DECIMAL(12,3),
ALTER COLUMN "quantity_liters" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "date_added" DROP DEFAULT,
ALTER COLUMN "remaining_quantity_liters" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "capacity_kg" DECIMAL(12,3),
ADD COLUMN     "current_kg" DECIMAL(12,3),
ADD COLUMN     "current_liters" DECIMAL(12,3),
ALTER COLUMN "kapacitet_cisterne" SET DATA TYPE DECIMAL(12,3);

-- CreateIndex
CREATE INDEX "MobileTankCustoms_mobile_tank_id_customs_declaration_number_idx" ON "MobileTankCustoms"("mobile_tank_id", "customs_declaration_number");

-- AddForeignKey
ALTER TABLE "MobileTankCustoms" ADD CONSTRAINT "MobileTankCustoms_mobile_tank_id_fkey" FOREIGN KEY ("mobile_tank_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
