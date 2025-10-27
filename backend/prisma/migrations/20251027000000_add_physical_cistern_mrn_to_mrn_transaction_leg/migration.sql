-- Add physicalCisternMrnId to MrnTransactionLeg table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MrnTransactionLeg' AND column_name='physicalCisternMrnId') THEN
    ALTER TABLE "MrnTransactionLeg" ADD COLUMN "physicalCisternMrnId" INTEGER;
  END IF;
END $$;

-- Add foreign key constraint for MrnTransactionLeg
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MrnTransactionLeg_physicalCisternMrnId_fkey') THEN
    ALTER TABLE "MrnTransactionLeg" ADD CONSTRAINT "MrnTransactionLeg_physicalCisternMrnId_fkey" 
    FOREIGN KEY ("physicalCisternMrnId") REFERENCES "PhysicalCisternMrn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "MrnTransactionLeg_physicalCisternMrnId_idx" ON "MrnTransactionLeg"("physicalCisternMrnId");

-- Add cistern_id to FuelingOperation table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FuelingOperation' AND column_name='cistern_id') THEN
    ALTER TABLE "FuelingOperation" ADD COLUMN "cistern_id" INTEGER;
  END IF;
END $$;

-- Add foreign key constraint for FuelingOperation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FuelingOperation_cistern_id_fkey') THEN
    ALTER TABLE "FuelingOperation" ADD CONSTRAINT "FuelingOperation_cistern_id_fkey" 
    FOREIGN KEY ("cistern_id") REFERENCES "PhysicalCisternFuel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "FuelingOperation_cistern_id_idx" ON "FuelingOperation"("cistern_id");
