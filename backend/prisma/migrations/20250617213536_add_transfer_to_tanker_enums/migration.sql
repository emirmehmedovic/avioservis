-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MrnTransactionType" ADD VALUE 'TRANSFER_TO_TANKER_OUT';
ALTER TYPE "MrnTransactionType" ADD VALUE 'TRANSFER_TO_TANKER_IN';
ALTER TYPE "MrnTransactionType" ADD VALUE 'MANUAL_EXCESS_FUEL_SALE';
