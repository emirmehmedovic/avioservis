-- CreateEnum
CREATE TYPE "MrnTransactionType" AS ENUM ('INITIAL_INTAKE', 'FIXED_TO_MOBILE_TRANSFER_OUT', 'FIXED_TO_MOBILE_TRANSFER_IN', 'MOBILE_TO_AIRCRAFT_FUELING', 'FUEL_DRAIN_FROM_FIXED', 'FUEL_DRAIN_FROM_MOBILE', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS');

-- AlterTable
ALTER TABLE "MobileTankCustoms" ADD COLUMN     "accumulatedLiterVariance" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TankFuelByCustoms" ADD COLUMN     "accumulatedLiterVariance" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MrnTransactionLeg" (
    "id" SERIAL NOT NULL,
    "tankFuelByCustomsId" INTEGER,
    "mobileTankCustomsId" INTEGER,
    "transactionType" "MrnTransactionType" NOT NULL,
    "relatedTransactionId" TEXT,
    "kgTransacted" DECIMAL(12,3) NOT NULL,
    "litersTransactedActual" DECIMAL(12,3) NOT NULL,
    "operationalDensityUsed" DECIMAL(8,4) NOT NULL,
    "literVarianceForThisLeg" DECIMAL(12,3) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MrnTransactionLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrnClosedVariance" (
    "id" SERIAL NOT NULL,
    "customsDeclarationNumber" TEXT NOT NULL,
    "dateMrnClosed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalKgProcessed" DECIMAL(12,3) NOT NULL,
    "netLiterVariance" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MrnClosedVariance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MrnTransactionLeg_tankFuelByCustomsId_idx" ON "MrnTransactionLeg"("tankFuelByCustomsId");

-- CreateIndex
CREATE INDEX "MrnTransactionLeg_mobileTankCustomsId_idx" ON "MrnTransactionLeg"("mobileTankCustomsId");

-- CreateIndex
CREATE INDEX "MrnTransactionLeg_timestamp_idx" ON "MrnTransactionLeg"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MrnClosedVariance_customsDeclarationNumber_key" ON "MrnClosedVariance"("customsDeclarationNumber");

-- AddForeignKey
ALTER TABLE "MrnTransactionLeg" ADD CONSTRAINT "MrnTransactionLeg_tankFuelByCustomsId_fkey" FOREIGN KEY ("tankFuelByCustomsId") REFERENCES "TankFuelByCustoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrnTransactionLeg" ADD CONSTRAINT "MrnTransactionLeg_mobileTankCustomsId_fkey" FOREIGN KEY ("mobileTankCustomsId") REFERENCES "MobileTankCustoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
