/*
  Warnings:

  - You are about to alter the column `price_per_kg` on the `FuelingOperation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,5)`.
  - You are about to alter the column `total_amount` on the `FuelingOperation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,5)`.
  - Made the column `price_per_kg` on table `FuelingOperation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_amount` on table `FuelingOperation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FuelingOperation" ADD COLUMN     "discount_percentage" DOUBLE PRECISION,
ALTER COLUMN "price_per_kg" SET NOT NULL,
ALTER COLUMN "price_per_kg" SET DATA TYPE DECIMAL(10,5),
ALTER COLUMN "total_amount" SET NOT NULL,
ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(15,5);
