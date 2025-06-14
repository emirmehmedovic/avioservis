/*
  Warnings:

  - You are about to drop the column `companyId` on the `Location` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_companyId_fkey";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "companyId",
ADD COLUMN     "companyTaxId" TEXT;
