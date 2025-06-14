/*
  Warnings:

  - The values [FUEL_USER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `capacity` on the `FuelTank` table. All the data in the column will be lost.
  - You are about to drop the column `current_level` on the `FuelTank` table. All the data in the column will be lost.
  - You are about to drop the `FuelTransaction` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[identifier]` on the table `FuelTank` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `capacity_liters` to the `FuelTank` table without a default value. This is not possible if the table is not empty.
  - Added the required column `current_liters` to the `FuelTank` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fuel_type` to the `FuelTank` table without a default value. This is not possible if the table is not empty.
  - Added the required column `identifier` to the `FuelTank` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FuelTank` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'SERVICER', 'FUEL_OPERATOR');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FuelTransaction" DROP CONSTRAINT "FuelTransaction_tankId_fkey";

-- DropForeignKey
ALTER TABLE "FuelTransaction" DROP CONSTRAINT "FuelTransaction_vehicleId_fkey";

-- AlterTable
ALTER TABLE "FuelTank" DROP COLUMN "capacity",
DROP COLUMN "current_level",
ADD COLUMN     "capacity_liters" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_liters" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "fuel_type" TEXT NOT NULL,
ADD COLUMN     "identifier" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "FuelTransaction";

-- DropEnum
DROP TYPE "TransactionType";

-- CreateTable
CREATE TABLE "FuelTankRefill" (
    "id" SERIAL NOT NULL,
    "tankId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity_liters" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT NOT NULL,
    "invoice_number" TEXT,
    "price_per_liter" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelTankRefill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airline" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelingOperation" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "aircraftId" INTEGER,
    "aircraft_registration" TEXT,
    "airlineId" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "quantity_liters" DOUBLE PRECISION NOT NULL,
    "tankId" INTEGER NOT NULL,
    "flight_number" TEXT,
    "operator_name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airline_name_key" ON "Airline"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FuelTank_identifier_key" ON "FuelTank"("identifier");

-- AddForeignKey
ALTER TABLE "FuelTankRefill" ADD CONSTRAINT "FuelTankRefill_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingOperation" ADD CONSTRAINT "FuelingOperation_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingOperation" ADD CONSTRAINT "FuelingOperation_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingOperation" ADD CONSTRAINT "FuelingOperation_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
