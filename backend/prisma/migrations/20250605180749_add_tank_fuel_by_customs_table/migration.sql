/*
  Warnings:

  - The values [ENGINE,BRAKES,TRANSMISSION,ELECTRICAL,TIRES,ADR_CERTIFICATION,CWD_EXPIRY] on the enum `ServiceItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ServiceItemType_new" AS ENUM ('HOSE_HD63', 'HOSE_HD38', 'HOSE_TW75', 'HOSE_LEAK_TEST', 'VOLUMETER', 'MANOMETER', 'HECPV_ILCPV', 'SIX_MONTH_CHECK', 'FILTER', 'FILTER_ANNUAL_INSPECTION', 'FILTER_EW_SENSOR_INSPECTION', 'THERMOMETER_CALIBRATION', 'HYDROMETER_CALIBRATION', 'CONDUCTIVITY_METER_CALIBRATION', 'RESISTANCE_METER_CALIBRATION', 'MAIN_FLOW_METER_CALIBRATION', 'TORQUE_WRENCH_CALIBRATION', 'OVERWING_HOSE_TEST', 'UNDERWING_HOSE_TEST', 'HD38_PRESSURE_TEST', 'HD63_PRESSURE_TEST', 'TW75_PRESSURE_TEST', 'QUARTERLY_INSPECTION', 'WATER_CHEMICAL_TEST', 'TACHOGRAPH_CALIBRATION', 'OIL_CHANGE', 'BRAKE_SERVICE', 'TIRE_REPLACEMENT', 'ENGINE_SERVICE', 'ELECTRICAL_SERVICE', 'GENERAL_SERVICE', 'TANKER_CALIBRATION', 'TANKER_PRESSURE_TEST', 'TANKER_FIRE_SAFETY_TEST', 'WORK_ORDER', 'OTHER');
ALTER TABLE "ServiceItem" ALTER COLUMN "type" TYPE "ServiceItemType_new" USING ("type"::text::"ServiceItemType_new");
ALTER TYPE "ServiceItemType" RENAME TO "ServiceItemType_old";
ALTER TYPE "ServiceItemType_new" RENAME TO "ServiceItemType";
DROP TYPE "ServiceItemType_old";
COMMIT;

-- AlterTable
ALTER TABLE "ValveTestRecord" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TankFuelByCustoms" (
    "id" SERIAL NOT NULL,
    "fixed_tank_id" INTEGER NOT NULL,
    "fuel_intake_record_id" INTEGER NOT NULL,
    "customs_declaration_number" TEXT NOT NULL,
    "quantity_liters" DOUBLE PRECISION NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remaining_quantity_liters" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TankFuelByCustoms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_fixed_tank_id_idx" ON "TankFuelByCustoms"("fixed_tank_id");

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_fuel_intake_record_id_idx" ON "TankFuelByCustoms"("fuel_intake_record_id");

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_customs_declaration_number_idx" ON "TankFuelByCustoms"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_date_added_idx" ON "TankFuelByCustoms"("date_added");

-- CreateIndex
CREATE INDEX "FuelIntakeRecords_customs_declaration_number_idx" ON "FuelIntakeRecords"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "ValveTestRecord_vehicleId_idx" ON "ValveTestRecord"("vehicleId");

-- CreateIndex
CREATE INDEX "ValveTestRecord_testDate_idx" ON "ValveTestRecord"("testDate");

-- CreateIndex
CREATE INDEX "ValveTestRecord_testType_idx" ON "ValveTestRecord"("testType");

-- AddForeignKey
ALTER TABLE "TankFuelByCustoms" ADD CONSTRAINT "TankFuelByCustoms_fixed_tank_id_fkey" FOREIGN KEY ("fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankFuelByCustoms" ADD CONSTRAINT "TankFuelByCustoms_fuel_intake_record_id_fkey" FOREIGN KEY ("fuel_intake_record_id") REFERENCES "FuelIntakeRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
