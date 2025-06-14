/*
  Warnings:

  - A unique constraint covering the columns `[airlineId,currency]` on the table `FuelPriceRule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FuelPriceRule_airlineId_currency_key" ON "FuelPriceRule"("airlineId", "currency");
