/*
  Warnings:

  - You are about to drop the `ServiceLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ServiceRecordCategory" AS ENUM ('REGULAR_MAINTENANCE', 'REPAIR', 'TECHNICAL_INSPECTION', 'FILTER_REPLACEMENT', 'HOSE_REPLACEMENT', 'CALIBRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceItemType" AS ENUM ('FILTER', 'HOSE_HD63', 'HOSE_HD38', 'HOSE_TW75', 'HOSE_LEAK_TEST', 'VOLUMETER', 'MANOMETER', 'HECPV_ILCPV', 'SIX_MONTH_CHECK', 'ENGINE', 'BRAKES', 'TRANSMISSION', 'ELECTRICAL', 'TIRES', 'OTHER');

-- DropForeignKey
ALTER TABLE "ServiceLog" DROP CONSTRAINT "ServiceLog_vehicleId_fkey";

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "image_url" TEXT;

-- DropTable
DROP TABLE "ServiceLog";

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ServiceRecordCategory" NOT NULL,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" SERIAL NOT NULL,
    "serviceRecordId" INTEGER NOT NULL,
    "type" "ServiceItemType" NOT NULL,
    "description" TEXT,
    "replaced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
