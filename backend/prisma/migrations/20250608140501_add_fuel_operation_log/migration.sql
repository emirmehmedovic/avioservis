-- CreateEnum
CREATE TYPE "FuelOperationType" AS ENUM ('INTAKE', 'TRANSFER_BETWEEN_TANKS', 'TRANSFER_TO_TANKER', 'FUELING_OPERATION', 'DRAIN', 'DRAIN_REVERSE', 'ADJUSTMENT', 'SYNC');

-- CreateTable
CREATE TABLE "FuelOperationLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationType" "FuelOperationType" NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "stateBefore" TEXT NOT NULL,
    "stateAfter" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" INTEGER NOT NULL,
    "targetEntityType" TEXT,
    "targetEntityId" INTEGER,
    "quantityLiters" DOUBLE PRECISION NOT NULL,
    "fuelType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "userId" INTEGER,
    "transactionId" TEXT,

    CONSTRAINT "FuelOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelOperationLog_timestamp_idx" ON "FuelOperationLog"("timestamp");

-- CreateIndex
CREATE INDEX "FuelOperationLog_operationType_idx" ON "FuelOperationLog"("operationType");

-- CreateIndex
CREATE INDEX "FuelOperationLog_sourceEntityType_sourceEntityId_idx" ON "FuelOperationLog"("sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "FuelOperationLog_targetEntityType_targetEntityId_idx" ON "FuelOperationLog"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "FuelOperationLog_userId_idx" ON "FuelOperationLog"("userId");

-- CreateIndex
CREATE INDEX "FuelOperationLog_success_idx" ON "FuelOperationLog"("success");

-- AddForeignKey
ALTER TABLE "FuelOperationLog" ADD CONSTRAINT "FuelOperationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
