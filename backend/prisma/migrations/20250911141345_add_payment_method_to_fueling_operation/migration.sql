-- AlterTable
ALTER TABLE "FuelingOperation" ADD COLUMN "payment_method" TEXT;

-- CreateIndex
CREATE INDEX "FuelingOperation_payment_method_idx" ON "FuelingOperation"("payment_method");
