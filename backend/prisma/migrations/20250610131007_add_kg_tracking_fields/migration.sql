-- AlterTable
ALTER TABLE "FixedStorageTanks" ADD COLUMN     "current_quantity_kg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FuelTank" ADD COLUMN     "current_kg" DECIMAL(65,30) NOT NULL DEFAULT 0;
