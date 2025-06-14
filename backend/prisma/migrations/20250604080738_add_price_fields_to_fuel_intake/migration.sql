-- AlterTable
ALTER TABLE "FuelIntakeRecords" ADD COLUMN "price_per_kg" DOUBLE PRECISION;
ALTER TABLE "FuelIntakeRecords" ADD COLUMN "currency" TEXT;
ALTER TABLE "FuelIntakeRecords" ADD COLUMN "total_price" DOUBLE PRECISION;
