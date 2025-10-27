-- AlterTable - Add physical_tank_distribution field to FuelIntakeRecords
ALTER TABLE "FuelIntakeRecords" ADD COLUMN "physical_tank_distribution" TEXT;

-- CreateTable - PhysicalTanks
CREATE TABLE "PhysicalTanks" (
    "id" SERIAL NOT NULL,
    "tank_name" TEXT NOT NULL,
    "tank_identifier" TEXT NOT NULL,
    "capacity_liters" DOUBLE PRECISION NOT NULL,
    "current_quantity_liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_quantity_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuel_type" TEXT NOT NULL,
    "location_description" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalTanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable - PhysicalTankMrn
CREATE TABLE "PhysicalTankMrn" (
    "id" SERIAL NOT NULL,
    "physical_tank_id" INTEGER NOT NULL,
    "customs_declaration_number" TEXT NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "quantity_kg" DECIMAL(12,3) NOT NULL,
    "remaining_quantity_liters" DECIMAL(12,3) NOT NULL,
    "remaining_quantity_kg" DECIMAL(12,3) NOT NULL,
    "density_at_intake" DECIMAL(8,4) NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL,
    "fuel_intake_record_id" INTEGER,
    "is_retrofitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalTankMrn_pkey" PRIMARY KEY ("id")
);

-- CreateTable - PhysicalCisternFuel
CREATE TABLE "PhysicalCisternFuel" (
    "id" SERIAL NOT NULL,
    "cistern_identifier" TEXT NOT NULL,
    "capacity_liters" DOUBLE PRECISION NOT NULL,
    "current_quantity_liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_quantity_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuel_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalCisternFuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable - PhysicalCisternMrn
CREATE TABLE "PhysicalCisternMrn" (
    "id" SERIAL NOT NULL,
    "cistern_id" INTEGER NOT NULL,
    "customs_declaration_number" TEXT NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "quantity_kg" DECIMAL(12,3) NOT NULL,
    "remaining_quantity_liters" DECIMAL(12,3) NOT NULL,
    "remaining_quantity_kg" DECIMAL(12,3) NOT NULL,
    "density_at_intake" DECIMAL(8,4) NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL,
    "source_physical_tank_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalCisternMrn_pkey" PRIMARY KEY ("id")
);

-- CreateTable - PhysicalTankTransfer
CREATE TABLE "PhysicalTankTransfer" (
    "id" SERIAL NOT NULL,
    "source_physical_tank_id" INTEGER NOT NULL,
    "target_cistern_id" INTEGER NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "quantity_kg" DECIMAL(12,3) NOT NULL,
    "transfer_datetime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "mrn_breakdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalTankTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalTanks_tank_name_key" ON "PhysicalTanks"("tank_name");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalTanks_tank_identifier_key" ON "PhysicalTanks"("tank_identifier");

-- CreateIndex
CREATE INDEX "PhysicalTanks_fuel_type_idx" ON "PhysicalTanks"("fuel_type");

-- CreateIndex
CREATE INDEX "PhysicalTanks_is_active_idx" ON "PhysicalTanks"("is_active");

-- CreateIndex
CREATE INDEX "PhysicalTanks_tank_identifier_idx" ON "PhysicalTanks"("tank_identifier");

-- CreateIndex
CREATE INDEX "PhysicalTankMrn_physical_tank_id_idx" ON "PhysicalTankMrn"("physical_tank_id");

-- CreateIndex
CREATE INDEX "PhysicalTankMrn_customs_declaration_number_idx" ON "PhysicalTankMrn"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "PhysicalTankMrn_date_added_idx" ON "PhysicalTankMrn"("date_added");

-- CreateIndex
CREATE INDEX "PhysicalTankMrn_is_retrofitted_idx" ON "PhysicalTankMrn"("is_retrofitted");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalCisternFuel_cistern_identifier_key" ON "PhysicalCisternFuel"("cistern_identifier");

-- CreateIndex
CREATE INDEX "PhysicalCisternFuel_cistern_identifier_idx" ON "PhysicalCisternFuel"("cistern_identifier");

-- CreateIndex
CREATE INDEX "PhysicalCisternFuel_is_active_idx" ON "PhysicalCisternFuel"("is_active");

-- CreateIndex
CREATE INDEX "PhysicalCisternMrn_cistern_id_idx" ON "PhysicalCisternMrn"("cistern_id");

-- CreateIndex
CREATE INDEX "PhysicalCisternMrn_customs_declaration_number_idx" ON "PhysicalCisternMrn"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "PhysicalCisternMrn_date_added_idx" ON "PhysicalCisternMrn"("date_added");

-- CreateIndex
CREATE INDEX "PhysicalTankTransfer_source_physical_tank_id_idx" ON "PhysicalTankTransfer"("source_physical_tank_id");

-- CreateIndex
CREATE INDEX "PhysicalTankTransfer_target_cistern_id_idx" ON "PhysicalTankTransfer"("target_cistern_id");

-- CreateIndex
CREATE INDEX "PhysicalTankTransfer_transfer_datetime_idx" ON "PhysicalTankTransfer"("transfer_datetime");

-- AddForeignKey
ALTER TABLE "PhysicalTankMrn" ADD CONSTRAINT "PhysicalTankMrn_physical_tank_id_fkey" FOREIGN KEY ("physical_tank_id") REFERENCES "PhysicalTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCisternMrn" ADD CONSTRAINT "PhysicalCisternMrn_cistern_id_fkey" FOREIGN KEY ("cistern_id") REFERENCES "PhysicalCisternFuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalTankTransfer" ADD CONSTRAINT "PhysicalTankTransfer_source_physical_tank_id_fkey" FOREIGN KEY ("source_physical_tank_id") REFERENCES "PhysicalTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalTankTransfer" ADD CONSTRAINT "PhysicalTankTransfer_target_cistern_id_fkey" FOREIGN KEY ("target_cistern_id") REFERENCES "PhysicalCisternFuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;





