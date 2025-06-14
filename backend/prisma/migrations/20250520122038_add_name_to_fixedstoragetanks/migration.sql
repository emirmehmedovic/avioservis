/*
  Warnings:

  - You are about to drop the column `current_liters` on the `FixedStorageTanks` table. All the data in the column will be lost.
  - You are about to drop the column `tank_identifier` on the `FixedStorageTanks` table. All the data in the column will be lost.
  - You are about to drop the column `tank_name` on the `FixedStorageTanks` table. All the data in the column will be lost.
  - The `status` column on the `FixedStorageTanks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[identifier]` on the table `FixedStorageTanks` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identifier` to the `FixedStorageTanks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `FixedStorageTanks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FixedTankStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- DropIndex
DROP INDEX "FixedStorageTanks_tank_identifier_key";

-- AlterTable
ALTER TABLE "FixedStorageTanks" DROP COLUMN "current_liters",
DROP COLUMN "tank_identifier",
DROP COLUMN "tank_name",
ADD COLUMN     "current_quantity_liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "identifier" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "FixedTankStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "FixedStorageTanks_identifier_key" ON "FixedStorageTanks"("identifier");
