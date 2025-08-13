-- DropForeignKey
ALTER TABLE "FuelPriceRule" DROP CONSTRAINT "FuelPriceRule_airlineId_fkey";

-- AlterTable
ALTER TABLE "FuelPriceRule" ALTER COLUMN "airlineId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FuelPriceRule" ADD CONSTRAINT "FuelPriceRule_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
