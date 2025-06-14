-- CreateTable
CREATE TABLE "FuelPriceRule" (
    "id" SERIAL NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "airlineId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelPriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelPriceRule_airlineId_idx" ON "FuelPriceRule"("airlineId");

-- AddForeignKey
ALTER TABLE "FuelPriceRule" ADD CONSTRAINT "FuelPriceRule_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
