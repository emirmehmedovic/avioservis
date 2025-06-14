-- CreateTable
CREATE TABLE "FuelDrainRecord" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceFixedTankId" INTEGER,
    "sourceMobileTankId" INTEGER,
    "quantityLiters" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelDrainRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelDrainRecord_sourceFixedTankId_idx" ON "FuelDrainRecord"("sourceFixedTankId");

-- CreateIndex
CREATE INDEX "FuelDrainRecord_sourceMobileTankId_idx" ON "FuelDrainRecord"("sourceMobileTankId");

-- CreateIndex
CREATE INDEX "FuelDrainRecord_userId_idx" ON "FuelDrainRecord"("userId");

-- AddForeignKey
ALTER TABLE "FuelDrainRecord" ADD CONSTRAINT "FuelDrainRecord_sourceFixedTankId_fkey" FOREIGN KEY ("sourceFixedTankId") REFERENCES "FixedStorageTanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDrainRecord" ADD CONSTRAINT "FuelDrainRecord_sourceMobileTankId_fkey" FOREIGN KEY ("sourceMobileTankId") REFERENCES "FuelTank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDrainRecord" ADD CONSTRAINT "FuelDrainRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
