-- CreateTable
CREATE TABLE "FuelIntakeRecords" (
    "id" SERIAL NOT NULL,
    "delivery_vehicle_plate" TEXT NOT NULL,
    "delivery_vehicle_driver_name" TEXT,
    "intake_datetime" TIMESTAMP(3) NOT NULL,
    "quantity_liters_received" DOUBLE PRECISION NOT NULL,
    "quantity_kg_received" DOUBLE PRECISION NOT NULL,
    "specific_gravity" DOUBLE PRECISION NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "supplier_name" TEXT,
    "delivery_note_number" TEXT,
    "customs_declaration_number" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelIntakeRecords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelIntakeRecords_intake_datetime_idx" ON "FuelIntakeRecords"("intake_datetime");

-- CreateIndex
CREATE INDEX "FuelIntakeRecords_fuel_type_idx" ON "FuelIntakeRecords"("fuel_type");
