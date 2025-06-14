-- CreateEnum
CREATE TYPE "ValveTestType" AS ENUM ('HECPV', 'ILPCV');

-- CreateTable
CREATE TABLE "ValveTestRecord" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "testType" "ValveTestType" NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "fuelHoseType" TEXT NOT NULL,
    "fuelHoseProductionDate" TIMESTAMP(3),
    "maxFlowRate" DOUBLE PRECISION,
    "pressureReading" DOUBLE PRECISION,
    "maxPressureDuringClosing" DOUBLE PRECISION,
    "pressureAtZeroFlow" DOUBLE PRECISION,
    "pressureAfterThirtySeconds" DOUBLE PRECISION,
    "pressureIncrease" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValveTestRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ValveTestRecord" ADD CONSTRAINT "ValveTestRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
