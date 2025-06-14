/*
  Warnings:

  - Added the required column `userId` to the `FuelTransferToTanker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FuelTransferToTanker" ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "FuelTransferToTanker_userId_idx" ON "FuelTransferToTanker"("userId");

-- AddForeignKey
ALTER TABLE "FuelTransferToTanker" ADD CONSTRAINT "FuelTransferToTanker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
