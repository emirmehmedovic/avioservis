-- CreateTable
CREATE TABLE "FixedStorageTanks" (
    "id" SERIAL NOT NULL,
    "tank_name" TEXT NOT NULL,
    "tank_identifier" TEXT NOT NULL,
    "capacity_liters" DOUBLE PRECISION NOT NULL,
    "current_liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuel_type" TEXT NOT NULL,
    "location_description" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedStorageTanks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FixedStorageTanks_tank_identifier_key" ON "FixedStorageTanks"("tank_identifier");

-- CreateIndex
CREATE INDEX "FixedStorageTanks_fuel_type_idx" ON "FixedStorageTanks"("fuel_type");
