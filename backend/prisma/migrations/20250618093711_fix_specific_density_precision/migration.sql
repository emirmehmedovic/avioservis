/*
  Warnings:

  - You are about to alter the column `specific_density` on the `FuelingOperation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,6)`.

*/
-- AlterTable
ALTER TABLE "FuelingOperation" ALTER COLUMN "specific_density" SET DATA TYPE DECIMAL(10,6);
