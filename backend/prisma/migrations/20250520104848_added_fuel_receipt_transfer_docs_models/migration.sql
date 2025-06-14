-- CreateTable
CREATE TABLE "FuelReceipt" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "fixedStorageTankId" INTEGER NOT NULL,
    "supplier" TEXT,
    "quantityLiters" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTransferToTanker" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "sourceFixedStorageTankId" INTEGER NOT NULL,
    "targetVehicleId" INTEGER NOT NULL,
    "quantityLiters" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelTransferToTanker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachedDocument" (
    "id" SERIAL NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fuelReceiptId" INTEGER,
    "fuelTransferToTankerId" INTEGER,

    CONSTRAINT "AttachedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelReceipt_fixedStorageTankId_idx" ON "FuelReceipt"("fixedStorageTankId");

-- CreateIndex
CREATE INDEX "FuelTransferToTanker_sourceFixedStorageTankId_idx" ON "FuelTransferToTanker"("sourceFixedStorageTankId");

-- CreateIndex
CREATE INDEX "FuelTransferToTanker_targetVehicleId_idx" ON "FuelTransferToTanker"("targetVehicleId");

-- CreateIndex
CREATE INDEX "AttachedDocument_fuelReceiptId_idx" ON "AttachedDocument"("fuelReceiptId");

-- CreateIndex
CREATE INDEX "AttachedDocument_fuelTransferToTankerId_idx" ON "AttachedDocument"("fuelTransferToTankerId");

-- CreateIndex
CREATE UNIQUE INDEX "AttachedDocument_storagePath_key" ON "AttachedDocument"("storagePath");

-- AddForeignKey
ALTER TABLE "FuelReceipt" ADD CONSTRAINT "FuelReceipt_fixedStorageTankId_fkey" FOREIGN KEY ("fixedStorageTankId") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransferToTanker" ADD CONSTRAINT "FuelTransferToTanker_sourceFixedStorageTankId_fkey" FOREIGN KEY ("sourceFixedStorageTankId") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransferToTanker" ADD CONSTRAINT "FuelTransferToTanker_targetVehicleId_fkey" FOREIGN KEY ("targetVehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachedDocument" ADD CONSTRAINT "AttachedDocument_fuelReceiptId_fkey" FOREIGN KEY ("fuelReceiptId") REFERENCES "FuelReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachedDocument" ADD CONSTRAINT "AttachedDocument_fuelTransferToTankerId_fkey" FOREIGN KEY ("fuelTransferToTankerId") REFERENCES "FuelTransferToTanker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
