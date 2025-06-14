-- CreateTable
CREATE TABLE "FixedTankTransfers" (
    "id" SERIAL NOT NULL,
    "fuel_intake_record_id" INTEGER NOT NULL,
    "fixed_storage_tank_id" INTEGER NOT NULL,
    "quantity_liters_transferred" DOUBLE PRECISION NOT NULL,
    "transfer_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "FixedTankTransfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedTankTransfers_fuel_intake_record_id_idx" ON "FixedTankTransfers"("fuel_intake_record_id");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_fixed_storage_tank_id_idx" ON "FixedTankTransfers"("fixed_storage_tank_id");

-- AddForeignKey
ALTER TABLE "FixedTankTransfers" ADD CONSTRAINT "FixedTankTransfers_fuel_intake_record_id_fkey" FOREIGN KEY ("fuel_intake_record_id") REFERENCES "FuelIntakeRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedTankTransfers" ADD CONSTRAINT "FixedTankTransfers_fixed_storage_tank_id_fkey" FOREIGN KEY ("fixed_storage_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
