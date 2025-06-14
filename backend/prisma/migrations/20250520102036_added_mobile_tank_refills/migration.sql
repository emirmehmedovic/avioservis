-- CreateTable
CREATE TABLE "MobileTankRefills" (
    "id" SERIAL NOT NULL,
    "source_fixed_tank_id" INTEGER NOT NULL,
    "target_mobile_tank_id" INTEGER NOT NULL,
    "quantity_liters" DOUBLE PRECISION NOT NULL,
    "transfer_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileTankRefills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileTankRefills_source_fixed_tank_id_idx" ON "MobileTankRefills"("source_fixed_tank_id");

-- CreateIndex
CREATE INDEX "MobileTankRefills_target_mobile_tank_id_idx" ON "MobileTankRefills"("target_mobile_tank_id");

-- CreateIndex
CREATE INDEX "MobileTankRefills_transfer_datetime_idx" ON "MobileTankRefills"("transfer_datetime");

-- AddForeignKey
ALTER TABLE "MobileTankRefills" ADD CONSTRAINT "MobileTankRefills_source_fixed_tank_id_fkey" FOREIGN KEY ("source_fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTankRefills" ADD CONSTRAINT "MobileTankRefills_target_mobile_tank_id_fkey" FOREIGN KEY ("target_mobile_tank_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
