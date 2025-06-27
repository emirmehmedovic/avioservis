/*
  Warnings:

  - You are about to drop the `TankReserveFuel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "TankReserveFuel";

-- CreateTable
CREATE TABLE "tank_reserve_fuel" (
    "id" SERIAL NOT NULL,
    "tank_id" INTEGER NOT NULL,
    "tank_type" TEXT NOT NULL,
    "source_mrn" TEXT NOT NULL,
    "source_mrn_id" INTEGER NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "quantity_kg" DECIMAL(12,3) NOT NULL,
    "is_excess" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_dispensed" BOOLEAN NOT NULL DEFAULT false,
    "dispensed_at" TIMESTAMP(3),
    "dispensed_by" TEXT,
    "notes" TEXT,
    "reference_operation_id" INTEGER,

    CONSTRAINT "tank_reserve_fuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rezervoari" (
    "id" SERIAL NOT NULL,
    "naziv_rezervoara" TEXT NOT NULL,
    "mjesto_koristenja" TEXT NOT NULL,
    "id_broj" TEXT NOT NULL,
    "vlasnik" TEXT NOT NULL,
    "oblik_rezervoara" TEXT NOT NULL,
    "kapacitet" DECIMAL(12,3) NOT NULL,
    "materijal_izgradnje" TEXT NOT NULL,
    "zastita_unutrasnjeg_rezervoara" TEXT NOT NULL,
    "datum_kalibracije" TIMESTAMP(3) NOT NULL,
    "dimenzije_l" DECIMAL(8,3) NOT NULL,
    "dimenzije_w" DECIMAL(8,3) NOT NULL,
    "dimenzije_h" DECIMAL(8,3) NOT NULL,
    "napomene" TEXT,
    "dokument_url" TEXT,
    "kreiran" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "azuriran" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rezervoari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rezervoari_id_broj_key" ON "rezervoari"("id_broj");
