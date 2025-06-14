/*
  Warnings:

  - Added the required column `quantity_kg` to the `FuelingOperation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AttachedDocument_fuelingOperationId_key";

-- AlterTable
ALTER TABLE "FuelingOperation" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "price_per_kg" DOUBLE PRECISION,
ADD COLUMN     "quantity_kg" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "specific_density" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
ADD COLUMN     "total_amount" DOUBLE PRECISION;
