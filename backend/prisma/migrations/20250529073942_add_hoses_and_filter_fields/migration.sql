-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "euro_norm" TEXT,
ADD COLUMN     "filter_cartridge_type" TEXT,
ADD COLUMN     "filter_ews" TEXT,
ADD COLUMN     "filter_replacement_date" TIMESTAMP(3),
ADD COLUMN     "filter_safety_valve" TEXT,
ADD COLUMN     "filter_separator_type" TEXT,
ADD COLUMN     "filter_standard" TEXT,
ADD COLUMN     "filter_vent_valve" TEXT,
ADD COLUMN     "filter_vessel_type" TEXT,
ADD COLUMN     "flow_rate" DOUBLE PRECISION,
ADD COLUMN     "fueling_type" TEXT,
ADD COLUMN     "licenca_datum_izdavanja" TIMESTAMP(3),
ADD COLUMN     "licenca_vazi_do" TIMESTAMP(3),
ADD COLUMN     "loading_type" TEXT,
ADD COLUMN     "manometer_calibration_date" TIMESTAMP(3),
ADD COLUMN     "manometer_calibration_valid_until" TIMESTAMP(3),
ADD COLUMN     "overwing_hose_diameter" TEXT,
ADD COLUMN     "overwing_hose_installation_date" TIMESTAMP(3),
ADD COLUMN     "overwing_hose_length" TEXT,
ADD COLUMN     "overwing_hose_lifespan" TEXT,
ADD COLUMN     "overwing_hose_production_date" TIMESTAMP(3),
ADD COLUMN     "overwing_hose_size" TEXT,
ADD COLUMN     "overwing_hose_standard" TEXT,
ADD COLUMN     "overwing_hose_test_date" TIMESTAMP(3),
ADD COLUMN     "overwing_hose_type" TEXT,
ADD COLUMN     "supported_fuel_types" TEXT,
ADD COLUMN     "tank_type" TEXT,
ADD COLUMN     "tromjesecni_pregled_datum" TIMESTAMP(3),
ADD COLUMN     "tromjesecni_pregled_vazi_do" TIMESTAMP(3),
ADD COLUMN     "truck_type" TEXT,
ADD COLUMN     "underwing_hose_diameter" TEXT,
ADD COLUMN     "underwing_hose_installation_date" TIMESTAMP(3),
ADD COLUMN     "underwing_hose_length" TEXT,
ADD COLUMN     "underwing_hose_lifespan" TEXT,
ADD COLUMN     "underwing_hose_production_date" TIMESTAMP(3),
ADD COLUMN     "underwing_hose_size" TEXT,
ADD COLUMN     "underwing_hose_standard" TEXT,
ADD COLUMN     "underwing_hose_test_date" TIMESTAMP(3),
ADD COLUMN     "underwing_hose_type" TEXT,
ADD COLUMN     "vehicle_description" TEXT,
ADD COLUMN     "vehicle_type" TEXT,
ADD COLUMN     "volumeter_kalibracija_datum" TIMESTAMP(3),
ADD COLUMN     "volumeter_kalibracija_vazi_do" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TechnicalDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" INTEGER NOT NULL,

    CONSTRAINT "TechnicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" INTEGER NOT NULL,

    CONSTRAINT "FilterDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TechnicalDocument_vehicleId_idx" ON "TechnicalDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "FilterDocument_vehicleId_idx" ON "FilterDocument"("vehicleId");

-- AddForeignKey
ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterDocument" ADD CONSTRAINT "FilterDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
