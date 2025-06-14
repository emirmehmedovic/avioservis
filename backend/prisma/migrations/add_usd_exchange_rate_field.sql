-- Add usd_exchange_rate field to FuelingOperation table
ALTER TABLE "FuelingOperation" ADD COLUMN "usd_exchange_rate" DECIMAL(15, 6);
