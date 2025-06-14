/*
  Warnings:

  - A unique constraint covering the columns `[fuelingOperationId]` on the table `AttachedDocument` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AttachedDocument" ADD COLUMN     "fuelingOperationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "AttachedDocument_fuelingOperationId_key" ON "AttachedDocument"("fuelingOperationId");

-- CreateIndex
CREATE INDEX "AttachedDocument_fuelingOperationId_idx" ON "AttachedDocument"("fuelingOperationId");

-- AddForeignKey
ALTER TABLE "AttachedDocument" ADD CONSTRAINT "AttachedDocument_fuelingOperationId_fkey" FOREIGN KEY ("fuelingOperationId") REFERENCES "FuelingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
