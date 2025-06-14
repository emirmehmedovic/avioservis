-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "cisterna_naredna_kalibracija" TIMESTAMP(3),
ADD COLUMN     "cisterna_zadnja_kalibracija" TIMESTAMP(3),
ADD COLUMN     "tahograf_naredna_kalibracija" TIMESTAMP(3),
ADD COLUMN     "tahograf_zadnja_kalibracija" TIMESTAMP(3),
ADD COLUMN     "tanker_last_fire_safety_test_date" TIMESTAMP(3),
ADD COLUMN     "tanker_next_fire_safety_test_date" TIMESTAMP(3);
