-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "tanker_last_pressure_test_date" TIMESTAMP(3),
ADD COLUMN     "tanker_next_pressure_test_date" TIMESTAMP(3);
