-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SERVICER', 'FUEL_USER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('IN', 'OUT_TO_AIRCRAFT', 'OUT_TO_VEHICLE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "companyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "status" "VehicleStatus" NOT NULL,
    "vehicle_name" TEXT NOT NULL,
    "license_plate" TEXT NOT NULL,
    "chassis_number" TEXT,
    "vessel_plate_no" TEXT,
    "notes" TEXT,
    "filter_installed" BOOLEAN NOT NULL,
    "filter_installation_date" TIMESTAMP(3),
    "filter_validity_period_months" INTEGER,
    "filter_expiry_date" TIMESTAMP(3),
    "filter_type_plate_no" TEXT,
    "last_annual_inspection_date" TIMESTAMP(3),
    "next_annual_inspection_date" TIMESTAMP(3),
    "sensor_technology" TEXT,
    "last_hose_hd63_replacement_date" TIMESTAMP(3),
    "next_hose_hd63_replacement_date" TIMESTAMP(3),
    "last_hose_hd38_replacement_date" TIMESTAMP(3),
    "next_hose_hd38_replacement_date" TIMESTAMP(3),
    "last_hose_tw75_replacement_date" TIMESTAMP(3),
    "next_hose_tw75_replacement_date" TIMESTAMP(3),
    "last_hose_leak_test_date" TIMESTAMP(3),
    "next_hose_leak_test_date" TIMESTAMP(3),
    "last_volumeter_calibration_date" TIMESTAMP(3),
    "next_volumeter_calibration_date" TIMESTAMP(3),
    "last_manometer_calibration_date" TIMESTAMP(3),
    "next_manometer_calibration_date" TIMESTAMP(3),
    "last_hecpv_ilcpv_test_date" TIMESTAMP(3),
    "next_hecpv_ilcpv_test_date" TIMESTAMP(3),
    "last_6_month_check_date" TIMESTAMP(3),
    "next_6_month_check_date" TIMESTAMP(3),
    "responsible_person_contact" TEXT,
    "companyId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleImage" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLog" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "service_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "performed_by" TEXT,
    "status" TEXT,
    "cost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "current_level" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FuelTank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTransaction" (
    "id" SERIAL NOT NULL,
    "tankId" INTEGER,
    "vehicleId" INTEGER,
    "transaction_type" "TransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "aircraft_registration" TEXT,
    "destination_company" TEXT,

    CONSTRAINT "FuelTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_license_plate_key" ON "Vehicle"("license_plate");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleImage" ADD CONSTRAINT "VehicleImage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLog" ADD CONSTRAINT "ServiceLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransaction" ADD CONSTRAINT "FuelTransaction_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransaction" ADD CONSTRAINT "FuelTransaction_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
