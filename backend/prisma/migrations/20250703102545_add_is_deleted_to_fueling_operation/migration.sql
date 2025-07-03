-- AlterTable
ALTER TABLE "FuelingOperation" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "FuelingOperation_is_deleted_idx" ON "FuelingOperation"("is_deleted");
