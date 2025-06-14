/*
  Warnings:

  - You are about to alter the column `quantity_kg_received` on the `FuelIntakeRecords` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantity_kg` on the `FuelingOperation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "FixedTankTransfers" ADD COLUMN     "quantity_kg_transferred" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "FuelIntakeRecords" ALTER COLUMN "quantity_kg_received" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "specific_gravity" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FuelingOperation" ALTER COLUMN "quantity_kg" SET DATA TYPE DECIMAL(65,30);
