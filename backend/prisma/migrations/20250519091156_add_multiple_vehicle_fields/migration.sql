-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "axle_count" INTEGER,
ADD COLUMN     "body_manufacturer" TEXT,
ADD COLUMN     "body_type" TEXT,
ADD COLUMN     "carrying_capacity_kg" DOUBLE PRECISION,
ADD COLUMN     "engine_displacement_ccm" INTEGER,
ADD COLUMN     "engine_power_kw" DOUBLE PRECISION,
ADD COLUMN     "fuel_type" TEXT,
ADD COLUMN     "seat_count" INTEGER,
ADD COLUMN     "tanker_compartments" INTEGER,
ADD COLUMN     "tanker_material" TEXT,
ADD COLUMN     "tanker_type" TEXT,
ADD COLUMN     "year_of_manufacture" INTEGER;
