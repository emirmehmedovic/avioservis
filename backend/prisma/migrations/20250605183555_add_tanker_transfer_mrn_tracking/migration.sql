-- AlterEnum
ALTER TYPE "FixedTankActivityType" ADD VALUE 'TANKER_TRANSFER_OUT';

-- AlterTable
ALTER TABLE "FuelTransferToTanker" ADD COLUMN     "mrnBreakdown" TEXT;
