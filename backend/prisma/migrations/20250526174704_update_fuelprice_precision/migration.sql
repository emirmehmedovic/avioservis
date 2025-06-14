/*
  Warnings:

  - You are about to alter the column `price` on the `FuelPriceRule` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,5)`.

*/
-- AlterTable
ALTER TABLE "FuelPriceRule" ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,5);
