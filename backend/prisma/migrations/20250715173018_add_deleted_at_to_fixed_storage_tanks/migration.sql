-- AlterTable
ALTER TABLE "FixedStorageTanks" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "FixedStorageTanks_deletedAt_idx" ON "FixedStorageTanks"("deletedAt");
