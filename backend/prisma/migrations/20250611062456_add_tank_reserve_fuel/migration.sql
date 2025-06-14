-- CreateTable
CREATE TABLE "TankReserveFuel" (
    "id" SERIAL NOT NULL,
    "tank_id" INTEGER NOT NULL,
    "tank_type" TEXT NOT NULL,
    "source_mrn" TEXT NOT NULL,
    "source_mrn_id" INTEGER NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "is_excess" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_dispensed" BOOLEAN NOT NULL DEFAULT false,
    "dispensed_at" TIMESTAMP(3),
    "dispensed_by" TEXT,
    "reference_operation_id" INTEGER,
    "notes" TEXT,

    CONSTRAINT "TankReserveFuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TankReserveFuel_tank_id_tank_type_idx" ON "TankReserveFuel"("tank_id", "tank_type");

-- CreateIndex
CREATE INDEX "TankReserveFuel_source_mrn_idx" ON "TankReserveFuel"("source_mrn");

-- CreateIndex
CREATE INDEX "TankReserveFuel_is_dispensed_idx" ON "TankReserveFuel"("is_dispensed");

-- CreateIndex
CREATE INDEX "TankReserveFuel_created_at_idx" ON "TankReserveFuel"("created_at");
