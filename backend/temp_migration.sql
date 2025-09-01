-- CreateEnum
CREATE TYPE "XmlDispatchStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmailDispatchStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "MrnTransactionType" AS ENUM ('INITIAL_INTAKE', 'FIXED_TO_MOBILE_TRANSFER_OUT', 'FIXED_TO_MOBILE_TRANSFER_IN', 'MOBILE_TO_AIRCRAFT_FUELING', 'FUEL_DRAIN_FROM_FIXED', 'FUEL_DRAIN_FROM_MOBILE', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS', 'TRANSFER_TO_TANKER_OUT', 'TRANSFER_TO_TANKER_IN', 'MANUAL_EXCESS_FUEL_SALE', 'EXCESS_TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SERVICER', 'FUEL_OPERATOR', 'KONTROLA', 'CARINA', 'AERODROM');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "FixedTankStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "FixedTankActivityType" AS ENUM ('INTAKE', 'INTERNAL_TRANSFER_OUT', 'INTERNAL_TRANSFER_IN', 'FUEL_DRAIN', 'FUEL_RETURN', 'TANKER_TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "ServiceRecordCategory" AS ENUM ('REGULAR_MAINTENANCE', 'REPAIR', 'TECHNICAL_INSPECTION', 'FILTER_REPLACEMENT', 'HOSE_REPLACEMENT', 'CALIBRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ValveTestType" AS ENUM ('HECPV', 'ILPCV');

-- CreateEnum
CREATE TYPE "ServiceItemType" AS ENUM ('HOSE_HD63', 'HOSE_HD38', 'HOSE_TW75', 'HOSE_LEAK_TEST', 'VOLUMETER', 'MANOMETER', 'HECPV_ILCPV', 'SIX_MONTH_CHECK', 'FILTER', 'FILTER_ANNUAL_INSPECTION', 'FILTER_EW_SENSOR_INSPECTION', 'THERMOMETER_CALIBRATION', 'HYDROMETER_CALIBRATION', 'CONDUCTIVITY_METER_CALIBRATION', 'RESISTANCE_METER_CALIBRATION', 'MAIN_FLOW_METER_CALIBRATION', 'TORQUE_WRENCH_CALIBRATION', 'OVERWING_HOSE_TEST', 'UNDERWING_HOSE_TEST', 'HD38_PRESSURE_TEST', 'HD63_PRESSURE_TEST', 'TW75_PRESSURE_TEST', 'QUARTERLY_INSPECTION', 'WATER_CHEMICAL_TEST', 'TACHOGRAPH_CALIBRATION', 'OIL_CHANGE', 'BRAKE_SERVICE', 'TIRE_REPLACEMENT', 'ENGINE_SERVICE', 'ELECTRICAL_SERVICE', 'GENERAL_SERVICE', 'TANKER_CALIBRATION', 'TANKER_PRESSURE_TEST', 'TANKER_FIRE_SAFETY_TEST', 'WORK_ORDER', 'OTHER');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FuelOperationType" AS ENUM ('INTAKE', 'TRANSFER_BETWEEN_TANKS', 'TRANSFER_TO_TANKER', 'FUELING_OPERATION', 'DRAIN', 'DRAIN_REVERSE', 'ADJUSTMENT', 'SYNC');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "contactPersonName" TEXT,
    "contactPersonPhone" TEXT,
    "taxId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyTaxId" TEXT,

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
    "image_url" TEXT,
    "adr_vazi_do" TIMESTAMP(3),
    "crijeva_za_tocenje" TEXT,
    "kapacitet_cisterne" DECIMAL(12,3),
    "periodicni_pregled_vazi_do" TIMESTAMP(3),
    "registrovano_do" TIMESTAMP(3),
    "tip_filtera" TEXT,
    "broj_crijeva_hd38" TEXT,
    "broj_crijeva_hd63" TEXT,
    "broj_crijeva_tw75" TEXT,
    "datum_isteka_cwd" TIMESTAMP(3),
    "datum_kalibracije_hidrometra" TIMESTAMP(3),
    "datum_kalibracije_moment_kljuca" TIMESTAMP(3),
    "datum_kalibracije_termometra" TIMESTAMP(3),
    "datum_kalibracije_uredjaja_elektricne_provodljivosti" TIMESTAMP(3),
    "datum_testiranja_pritiska_crijeva_hd38" TIMESTAMP(3),
    "datum_testiranja_pritiska_crijeva_hd63" TIMESTAMP(3),
    "datum_testiranja_pritiska_crijeva_tw75" TIMESTAMP(3),
    "filter_annual_inspection_date" TIMESTAMP(3),
    "filter_ew_sensor_inspection_date" TIMESTAMP(3),
    "filter_next_annual_inspection_date" TIMESTAMP(3),
    "filter_vessel_number" TEXT,
    "godina_proizvodnje_crijeva_hd38" INTEGER,
    "godina_proizvodnje_crijeva_hd63" INTEGER,
    "godina_proizvodnje_crijeva_tw75" INTEGER,
    "tanker_last_pressure_test_date" TIMESTAMP(3),
    "tanker_next_pressure_test_date" TIMESTAMP(3),
    "chassis_manufacturer" TEXT,
    "chassis_type" TEXT,
    "axle_count" INTEGER,
    "body_manufacturer" TEXT,
    "body_type" TEXT,
    "carrying_capacity_kg" DOUBLE PRECISION,
    "engine_displacement_ccm" INTEGER,
    "engine_power_kw" DOUBLE PRECISION,
    "fuel_type" TEXT,
    "seat_count" INTEGER,
    "tanker_compartments" INTEGER,
    "tanker_material" TEXT,
    "tanker_type" TEXT,
    "year_of_manufacture" INTEGER,
    "cisterna_naredna_kalibracija" TIMESTAMP(3),
    "cisterna_zadnja_kalibracija" TIMESTAMP(3),
    "tahograf_naredna_kalibracija" TIMESTAMP(3),
    "tahograf_zadnja_kalibracija" TIMESTAMP(3),
    "tanker_last_fire_safety_test_date" TIMESTAMP(3),
    "tanker_next_fire_safety_test_date" TIMESTAMP(3),
    "euro_norm" TEXT,
    "filter_cartridge_type" TEXT,
    "filter_ews" TEXT,
    "filter_replacement_date" TIMESTAMP(3),
    "filter_safety_valve" TEXT,
    "filter_separator_type" TEXT,
    "filter_standard" TEXT,
    "filter_vent_valve" TEXT,
    "filter_vessel_type" TEXT,
    "flow_rate" DOUBLE PRECISION,
    "fueling_type" TEXT,
    "licenca_datum_izdavanja" TIMESTAMP(3),
    "licenca_vazi_do" TIMESTAMP(3),
    "loading_type" TEXT,
    "manometer_calibration_date" TIMESTAMP(3),
    "manometer_calibration_valid_until" TIMESTAMP(3),
    "overwing_hose_diameter" TEXT,
    "overwing_hose_installation_date" TIMESTAMP(3),
    "overwing_hose_length" TEXT,
    "overwing_hose_lifespan" TEXT,
    "overwing_hose_production_date" TIMESTAMP(3),
    "overwing_hose_size" TEXT,
    "overwing_hose_standard" TEXT,
    "overwing_hose_test_date" TIMESTAMP(3),
    "overwing_hose_type" TEXT,
    "supported_fuel_types" TEXT,
    "tank_type" TEXT,
    "tromjesecni_pregled_datum" TIMESTAMP(3),
    "tromjesecni_pregled_vazi_do" TIMESTAMP(3),
    "truck_type" TEXT,
    "underwing_hose_diameter" TEXT,
    "underwing_hose_installation_date" TIMESTAMP(3),
    "underwing_hose_length" TEXT,
    "underwing_hose_lifespan" TEXT,
    "underwing_hose_production_date" TIMESTAMP(3),
    "underwing_hose_size" TEXT,
    "underwing_hose_standard" TEXT,
    "underwing_hose_test_date" TIMESTAMP(3),
    "underwing_hose_type" TEXT,
    "vehicle_description" TEXT,
    "vehicle_type" TEXT,
    "volumeter_kalibracija_datum" TIMESTAMP(3),
    "volumeter_kalibracija_vazi_do" TIMESTAMP(3),
    "conductivity_meter_calibration_date" TIMESTAMP(3),
    "conductivity_meter_calibration_valid_until" TIMESTAMP(3),
    "hydrometer_calibration_date" TIMESTAMP(3),
    "hydrometer_calibration_valid_until" TIMESTAMP(3),
    "main_flow_meter_calibration_date" TIMESTAMP(3),
    "main_flow_meter_calibration_valid_until" TIMESTAMP(3),
    "resistance_meter_calibration_date" TIMESTAMP(3),
    "resistance_meter_calibration_valid_until" TIMESTAMP(3),
    "thermometer_calibration_date" TIMESTAMP(3),
    "thermometer_calibration_valid_until" TIMESTAMP(3),
    "torque_wrench_calibration_date" TIMESTAMP(3),
    "torque_wrench_calibration_valid_until" TIMESTAMP(3),
    "water_chemical_test_date" TIMESTAMP(3),
    "water_chemical_test_valid_until" TIMESTAMP(3),
    "capacity_kg" DECIMAL(12,3),
    "current_kg" DECIMAL(12,3),
    "current_liters" DECIMAL(12,3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleImage" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isMainImage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VehicleImage_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "HoseDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" INTEGER NOT NULL,

    CONSTRAINT "HoseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedStorageTanks" (
    "id" SERIAL NOT NULL,
    "capacity_liters" DOUBLE PRECISION NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "location_description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "current_quantity_liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FixedTankStatus" NOT NULL DEFAULT 'ACTIVE',
    "tank_name" TEXT NOT NULL,
    "tank_identifier" TEXT,
    "last_checked_date" TIMESTAMP(3),
    "last_cleaned_date" TIMESTAMP(3),
    "manufacturer" TEXT,
    "notes" TEXT,
    "serial_number" TEXT,
    "year_of_manufacture" INTEGER,
    "identificationDocumentUrl" TEXT,
    "current_quantity_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FixedStorageTanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelIntakeRecords" (
    "id" SERIAL NOT NULL,
    "delivery_vehicle_plate" TEXT NOT NULL,
    "delivery_vehicle_driver_name" TEXT,
    "intake_datetime" TIMESTAMP(3) NOT NULL,
    "quantity_liters_received" DOUBLE PRECISION NOT NULL,
    "quantity_kg_received" DECIMAL(65,30) NOT NULL,
    "specific_gravity" DOUBLE PRECISION,
    "fuel_type" TEXT NOT NULL,
    "supplier_name" TEXT,
    "delivery_note_number" TEXT,
    "customs_declaration_number" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fuel_category" TEXT DEFAULT 'Domaće tržište',
    "refinery_name" TEXT,
    "price_per_kg" DOUBLE PRECISION,
    "currency" TEXT,
    "total_price" DOUBLE PRECISION,

    CONSTRAINT "FuelIntakeRecords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelIntakeDocuments" (
    "id" SERIAL NOT NULL,
    "fuel_intake_record_id" INTEGER NOT NULL,
    "document_name" TEXT NOT NULL,
    "document_path" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelIntakeDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedTankTransfers" (
    "id" SERIAL NOT NULL,
    "fuel_intake_record_id" INTEGER,
    "quantity_liters_transferred" DECIMAL(12,3) NOT NULL,
    "transfer_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "activity_type" "FixedTankActivityType" NOT NULL,
    "affected_fixed_tank_id" INTEGER NOT NULL,
    "counterparty_fixed_tank_id" INTEGER,
    "internal_transfer_pair_id" UUID,
    "quantity_kg_transferred" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "FixedTankTransfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileTankRefills" (
    "id" SERIAL NOT NULL,
    "source_fixed_tank_id" INTEGER NOT NULL,
    "target_mobile_tank_id" INTEGER NOT NULL,
    "quantity_liters" DOUBLE PRECISION NOT NULL,
    "transfer_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileTankRefills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ServiceRecordCategory" NOT NULL,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" SERIAL NOT NULL,
    "serviceRecordId" INTEGER NOT NULL,
    "type" "ServiceItemType" NOT NULL,
    "description" TEXT,
    "replaced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentDate" TIMESTAMP(3),
    "nextDate" TIMESTAMP(3),

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValveTestRecord" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "testType" "ValveTestType" NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "fuelHoseType" TEXT NOT NULL,
    "fuelHoseProductionDate" TIMESTAMP(3),
    "maxFlowRate" DOUBLE PRECISION,
    "pressureReading" DOUBLE PRECISION,
    "maxPressureDuringClosing" DOUBLE PRECISION,
    "pressureAtZeroFlow" DOUBLE PRECISION,
    "pressureAfterThirtySeconds" DOUBLE PRECISION,
    "pressureIncrease" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValveTestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity_liters" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_liters" DECIMAL(65,30) NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image_url" TEXT,
    "current_kg" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FuelTank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTankRefill" (
    "id" SERIAL NOT NULL,
    "tankId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity_liters" DECIMAL(65,30) NOT NULL,
    "supplier" TEXT NOT NULL,
    "invoice_number" TEXT,
    "price_per_liter" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelTankRefill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airline" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "isForeign" BOOLEAN NOT NULL DEFAULT false,
    "operatingDestinations" TEXT[],
    "taxId" TEXT,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelReceipt" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "fixedStorageTankId" INTEGER NOT NULL,
    "supplier" TEXT,
    "quantityLiters" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "FuelReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTransferToTanker" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "sourceFixedStorageTankId" INTEGER NOT NULL,
    "quantityLiters" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "targetFuelTankId" INTEGER NOT NULL,
    "mrnBreakdown" TEXT,

    CONSTRAINT "FuelTransferToTanker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelDrainRecord" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceFixedTankId" INTEGER,
    "sourceMobileTankId" INTEGER,
    "quantityLiters" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mrnBreakdown" TEXT,

    CONSTRAINT "FuelDrainRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachedDocument" (
    "id" SERIAL NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fuelReceiptId" INTEGER,
    "fuelingOperationId" INTEGER,

    CONSTRAINT "AttachedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelingOperation" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "aircraftId" INTEGER,
    "aircraft_registration" TEXT,
    "airlineId" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "quantity_liters" DECIMAL(65,30) NOT NULL,
    "tankId" INTEGER NOT NULL,
    "flight_number" TEXT,
    "operator_name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tip_saobracaja" TEXT,
    "currency" TEXT,
    "price_per_kg" DECIMAL(10,5) NOT NULL,
    "quantity_kg" DECIMAL(65,30) NOT NULL,
    "specific_density" DECIMAL(10,6) NOT NULL DEFAULT 0.8,
    "total_amount" DECIMAL(15,5) NOT NULL,
    "discount_percentage" DOUBLE PRECISION,
    "delivery_note_number" TEXT,
    "mrnBreakdown" TEXT,
    "usd_exchange_rate" DECIMAL(15,6),
    "exd_number" VARCHAR(50),
    "k_number" VARCHAR(50),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FuelingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "username" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelPriceRule" (
    "id" SERIAL NOT NULL,
    "price" DECIMAL(12,5) NOT NULL,
    "currency" TEXT NOT NULL,
    "airlineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelPriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelProjectionPreset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "presetData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calculatedResultsData" JSONB,

    CONSTRAINT "FuelProjectionPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankFuelByCustoms" (
    "id" SERIAL NOT NULL,
    "fixed_tank_id" INTEGER NOT NULL,
    "fuel_intake_record_id" INTEGER NOT NULL,
    "customs_declaration_number" TEXT NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL,
    "remaining_quantity_liters" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "density_at_intake" DECIMAL(8,4),
    "quantity_kg" DECIMAL(12,3),
    "remaining_quantity_kg" DECIMAL(12,3),
    "accumulatedLiterVariance" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "TankFuelByCustoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileTankCustoms" (
    "id" SERIAL NOT NULL,
    "mobile_tank_id" INTEGER NOT NULL,
    "customs_declaration_number" TEXT NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL,
    "remaining_quantity_liters" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "density_at_intake" DECIMAL(8,4) NOT NULL,
    "quantity_kg" DECIMAL(12,3) NOT NULL,
    "remaining_quantity_kg" DECIMAL(12,3) NOT NULL,
    "supplier_name" TEXT,
    "accumulatedLiterVariance" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "MobileTankCustoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrnTransactionLeg" (
    "id" SERIAL NOT NULL,
    "tankFuelByCustomsId" INTEGER,
    "mobileTankCustomsId" INTEGER,
    "transactionType" "MrnTransactionType" NOT NULL,
    "relatedTransactionId" TEXT,
    "kgTransacted" DECIMAL(12,3) NOT NULL,
    "litersTransactedActual" DECIMAL(12,3) NOT NULL,
    "operationalDensityUsed" DECIMAL(8,4) NOT NULL,
    "literVarianceForThisLeg" DECIMAL(12,3) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MrnTransactionLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrnClosedVariance" (
    "id" SERIAL NOT NULL,
    "customsDeclarationNumber" TEXT NOT NULL,
    "dateMrnClosed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalKgProcessed" DECIMAL(12,3) NOT NULL,
    "netLiterVariance" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MrnClosedVariance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "severity" "LogSeverity" NOT NULL DEFAULT 'INFO',
    "userId" INTEGER,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelOperationLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationType" "FuelOperationType" NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "stateBefore" TEXT NOT NULL,
    "stateAfter" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" INTEGER NOT NULL,
    "targetEntityType" TEXT,
    "targetEntityId" INTEGER,
    "quantityLiters" DOUBLE PRECISION NOT NULL,
    "fuelType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "userId" INTEGER,
    "transactionId" TEXT,

    CONSTRAINT "FuelOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XmlInvoiceDispatch" (
    "id" SERIAL NOT NULL,
    "fuelingOperationId" INTEGER NOT NULL,
    "airlineId" INTEGER NOT NULL,
    "status" "XmlDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "xmlFileName" TEXT NOT NULL,
    "xmlSha256" TEXT NOT NULL,
    "remotePath" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReceivedAt" TIMESTAMP(3),
    "paymentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XmlInvoiceDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailInvoiceDispatch" (
    "id" SERIAL NOT NULL,
    "fuelingOperationId" INTEGER NOT NULL,
    "airlineId" INTEGER NOT NULL,
    "status" "EmailDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "emailTo" TEXT NOT NULL,
    "emailSubject" TEXT NOT NULL,
    "emailBody" TEXT,
    "pdfFileName" TEXT NOT NULL,
    "pdfSha256" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReceivedAt" TIMESTAMP(3),
    "paymentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailInvoiceDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tank_reserve_fuel" (
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

-- CreateTable
CREATE TABLE "plan_kalibracije" (
    "id" SERIAL NOT NULL,
    "naziv_opreme" TEXT NOT NULL,
    "vlasnik_opreme" TEXT NOT NULL,
    "mjesto_koristenja_opreme" TEXT NOT NULL,
    "identifikacijski_broj" TEXT NOT NULL,
    "volumetar_kalibracija_od" TIMESTAMP(3),
    "volumetar_kalibracija_do" TIMESTAMP(3),
    "glavni_volumetar_kalibracija_od" TIMESTAMP(3),
    "glavni_volumetar_kalibracija_do" TIMESTAMP(3),
    "manometri_kalibracija_od" TIMESTAMP(3),
    "manometri_kalibracija_do" TIMESTAMP(3),
    "crijevo_punjenje_kalibracija_od" TIMESTAMP(3),
    "crijevo_punjenje_kalibracija_do" TIMESTAMP(3),
    "glavni_manometar_kalibracija_od" TIMESTAMP(3),
    "glavni_manometar_kalibracija_do" TIMESTAMP(3),
    "termometar_kalibracija_od" TIMESTAMP(3),
    "termometar_kalibracija_do" TIMESTAMP(3),
    "hidrometar_kalibracija_od" TIMESTAMP(3),
    "hidrometar_kalibracija_do" TIMESTAMP(3),
    "elektricni_denziometar_kalibracija_od" TIMESTAMP(3),
    "elektricni_denziometar_kalibracija_do" TIMESTAMP(3),
    "mjerac_provodljivosti_kalibracija_od" TIMESTAMP(3),
    "mjerac_provodljivosti_kalibracija_do" TIMESTAMP(3),
    "mjerac_otpora_provoda_kalibracija_od" TIMESTAMP(3),
    "mjerac_otpora_provoda_kalibracija_do" TIMESTAMP(3),
    "moment_kljuc_kalibracija_od" TIMESTAMP(3),
    "moment_kljuc_kalibracija_do" TIMESTAMP(3),
    "shal_detector_kalibracija_od" TIMESTAMP(3),
    "shal_detector_kalibracija_do" TIMESTAMP(3),
    "napomene" TEXT,
    "dokumenti_url" TEXT,
    "kreiran" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "azuriran" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_kalibracije_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OstalaOprema" (
    "id" SERIAL NOT NULL,
    "naziv" TEXT NOT NULL,
    "mesto_koristenja" TEXT,
    "vlasnik" TEXT,
    "standard_opreme" TEXT,
    "snaga" TEXT,
    "protok_kapacitet" TEXT,
    "sigurnosne_sklopke" TEXT,
    "prinudno_zaustavljanje" TEXT,
    "napomena" TEXT,
    "dokument_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OstalaOprema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_license_plate_key" ON "Vehicle"("license_plate");

-- CreateIndex
CREATE INDEX "TechnicalDocument_vehicleId_idx" ON "TechnicalDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "FilterDocument_vehicleId_idx" ON "FilterDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "HoseDocument_vehicleId_idx" ON "HoseDocument"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedStorageTanks_tank_name_key" ON "FixedStorageTanks"("tank_name");

-- CreateIndex
CREATE UNIQUE INDEX "FixedStorageTanks_tank_identifier_key" ON "FixedStorageTanks"("tank_identifier");

-- CreateIndex
CREATE INDEX "FixedStorageTanks_fuel_type_idx" ON "FixedStorageTanks"("fuel_type");

-- CreateIndex
CREATE INDEX "FixedStorageTanks_status_idx" ON "FixedStorageTanks"("status");

-- CreateIndex
CREATE INDEX "FixedStorageTanks_createdAt_idx" ON "FixedStorageTanks"("createdAt");

-- CreateIndex
CREATE INDEX "FixedStorageTanks_deletedAt_idx" ON "FixedStorageTanks"("deletedAt");

-- CreateIndex
CREATE INDEX "FuelIntakeRecords_intake_datetime_idx" ON "FuelIntakeRecords"("intake_datetime");

-- CreateIndex
CREATE INDEX "FuelIntakeRecords_fuel_type_idx" ON "FuelIntakeRecords"("fuel_type");

-- CreateIndex
CREATE INDEX "FuelIntakeRecords_customs_declaration_number_idx" ON "FuelIntakeRecords"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "FuelIntakeDocuments_fuel_intake_record_id_idx" ON "FuelIntakeDocuments"("fuel_intake_record_id");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_fuel_intake_record_id_idx" ON "FixedTankTransfers"("fuel_intake_record_id");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_affected_fixed_tank_id_idx" ON "FixedTankTransfers"("affected_fixed_tank_id");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_counterparty_fixed_tank_id_idx" ON "FixedTankTransfers"("counterparty_fixed_tank_id");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_internal_transfer_pair_id_idx" ON "FixedTankTransfers"("internal_transfer_pair_id");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_transfer_datetime_idx" ON "FixedTankTransfers"("transfer_datetime");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_activity_type_idx" ON "FixedTankTransfers"("activity_type");

-- CreateIndex
CREATE INDEX "MobileTankRefills_source_fixed_tank_id_idx" ON "MobileTankRefills"("source_fixed_tank_id");

-- CreateIndex
CREATE INDEX "MobileTankRefills_target_mobile_tank_id_idx" ON "MobileTankRefills"("target_mobile_tank_id");

-- CreateIndex
CREATE INDEX "MobileTankRefills_transfer_datetime_idx" ON "MobileTankRefills"("transfer_datetime");

-- CreateIndex
CREATE INDEX "ValveTestRecord_vehicleId_idx" ON "ValveTestRecord"("vehicleId");

-- CreateIndex
CREATE INDEX "ValveTestRecord_testDate_idx" ON "ValveTestRecord"("testDate");

-- CreateIndex
CREATE INDEX "ValveTestRecord_testType_idx" ON "ValveTestRecord"("testType");

-- CreateIndex
CREATE UNIQUE INDEX "FuelTank_identifier_key" ON "FuelTank"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_name_key" ON "Airline"("name");

-- CreateIndex
CREATE INDEX "FuelReceipt_fixedStorageTankId_idx" ON "FuelReceipt"("fixedStorageTankId");

-- CreateIndex
CREATE INDEX "FuelReceipt_userId_idx" ON "FuelReceipt"("userId");

-- CreateIndex
CREATE INDEX "FuelTransferToTanker_sourceFixedStorageTankId_idx" ON "FuelTransferToTanker"("sourceFixedStorageTankId");

-- CreateIndex
CREATE INDEX "FuelTransferToTanker_targetFuelTankId_idx" ON "FuelTransferToTanker"("targetFuelTankId");

-- CreateIndex
CREATE INDEX "FuelTransferToTanker_userId_idx" ON "FuelTransferToTanker"("userId");

-- CreateIndex
CREATE INDEX "FuelDrainRecord_sourceFixedTankId_idx" ON "FuelDrainRecord"("sourceFixedTankId");

-- CreateIndex
CREATE INDEX "FuelDrainRecord_sourceMobileTankId_idx" ON "FuelDrainRecord"("sourceMobileTankId");

-- CreateIndex
CREATE INDEX "FuelDrainRecord_userId_idx" ON "FuelDrainRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AttachedDocument_storagePath_key" ON "AttachedDocument"("storagePath");

-- CreateIndex
CREATE INDEX "AttachedDocument_fuelReceiptId_idx" ON "AttachedDocument"("fuelReceiptId");

-- CreateIndex
CREATE INDEX "AttachedDocument_fuelingOperationId_idx" ON "AttachedDocument"("fuelingOperationId");

-- CreateIndex
CREATE INDEX "FuelingOperation_dateTime_idx" ON "FuelingOperation"("dateTime");

-- CreateIndex
CREATE INDEX "FuelingOperation_airlineId_idx" ON "FuelingOperation"("airlineId");

-- CreateIndex
CREATE INDEX "FuelingOperation_aircraft_registration_idx" ON "FuelingOperation"("aircraft_registration");

-- CreateIndex
CREATE INDEX "FuelingOperation_tankId_idx" ON "FuelingOperation"("tankId");

-- CreateIndex
CREATE INDEX "FuelingOperation_operator_name_idx" ON "FuelingOperation"("operator_name");

-- CreateIndex
CREATE INDEX "FuelingOperation_tip_saobracaja_idx" ON "FuelingOperation"("tip_saobracaja");

-- CreateIndex
CREATE INDEX "FuelingOperation_flight_number_idx" ON "FuelingOperation"("flight_number");

-- CreateIndex
CREATE INDEX "FuelingOperation_delivery_note_number_idx" ON "FuelingOperation"("delivery_note_number");

-- CreateIndex
CREATE INDEX "FuelingOperation_createdAt_idx" ON "FuelingOperation"("createdAt");

-- CreateIndex
CREATE INDEX "FuelingOperation_is_deleted_idx" ON "FuelingOperation"("is_deleted");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_actionType_idx" ON "Activity"("actionType");

-- CreateIndex
CREATE INDEX "Activity_resourceType_resourceId_idx" ON "Activity"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Activity_timestamp_idx" ON "Activity"("timestamp");

-- CreateIndex
CREATE INDEX "FuelPriceRule_airlineId_idx" ON "FuelPriceRule"("airlineId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelPriceRule_airlineId_currency_key" ON "FuelPriceRule"("airlineId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "FuelProjectionPreset_name_key" ON "FuelProjectionPreset"("name");

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_fixed_tank_id_idx" ON "TankFuelByCustoms"("fixed_tank_id");

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_fuel_intake_record_id_idx" ON "TankFuelByCustoms"("fuel_intake_record_id");

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_customs_declaration_number_idx" ON "TankFuelByCustoms"("customs_declaration_number");

-- CreateIndex
CREATE INDEX "TankFuelByCustoms_date_added_idx" ON "TankFuelByCustoms"("date_added");

-- CreateIndex
CREATE INDEX "MobileTankCustoms_mobile_tank_id_customs_declaration_number_idx" ON "MobileTankCustoms"("mobile_tank_id", "customs_declaration_number");

-- CreateIndex
CREATE INDEX "MrnTransactionLeg_tankFuelByCustomsId_idx" ON "MrnTransactionLeg"("tankFuelByCustomsId");

-- CreateIndex
CREATE INDEX "MrnTransactionLeg_mobileTankCustomsId_idx" ON "MrnTransactionLeg"("mobileTankCustomsId");

-- CreateIndex
CREATE INDEX "MrnTransactionLeg_timestamp_idx" ON "MrnTransactionLeg"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MrnClosedVariance_customsDeclarationNumber_key" ON "MrnClosedVariance"("customsDeclarationNumber");

-- CreateIndex
CREATE INDEX "SystemLog_timestamp_idx" ON "SystemLog"("timestamp");

-- CreateIndex
CREATE INDEX "SystemLog_action_idx" ON "SystemLog"("action");

-- CreateIndex
CREATE INDEX "SystemLog_severity_idx" ON "SystemLog"("severity");

-- CreateIndex
CREATE INDEX "SystemLog_userId_idx" ON "SystemLog"("userId");

-- CreateIndex
CREATE INDEX "FuelOperationLog_timestamp_idx" ON "FuelOperationLog"("timestamp");

-- CreateIndex
CREATE INDEX "FuelOperationLog_operationType_idx" ON "FuelOperationLog"("operationType");

-- CreateIndex
CREATE INDEX "FuelOperationLog_sourceEntityType_sourceEntityId_idx" ON "FuelOperationLog"("sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "FuelOperationLog_targetEntityType_targetEntityId_idx" ON "FuelOperationLog"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "FuelOperationLog_userId_idx" ON "FuelOperationLog"("userId");

-- CreateIndex
CREATE INDEX "FuelOperationLog_success_idx" ON "FuelOperationLog"("success");

-- CreateIndex
CREATE UNIQUE INDEX "XmlInvoiceDispatch_fuelingOperationId_key" ON "XmlInvoiceDispatch"("fuelingOperationId");

-- CreateIndex
CREATE INDEX "XmlInvoiceDispatch_status_idx" ON "XmlInvoiceDispatch"("status");

-- CreateIndex
CREATE INDEX "XmlInvoiceDispatch_airlineId_idx" ON "XmlInvoiceDispatch"("airlineId");

-- CreateIndex
CREATE INDEX "XmlInvoiceDispatch_createdAt_idx" ON "XmlInvoiceDispatch"("createdAt");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_status_idx" ON "EmailInvoiceDispatch"("status");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_airlineId_idx" ON "EmailInvoiceDispatch"("airlineId");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_dispatchedAt_idx" ON "EmailInvoiceDispatch"("dispatchedAt");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_fuelingOperationId_idx" ON "EmailInvoiceDispatch"("fuelingOperationId");

-- CreateIndex
CREATE INDEX "EmailInvoiceDispatch_paymentStatus_idx" ON "EmailInvoiceDispatch"("paymentStatus");

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_tank_id_tank_type_idx" ON "tank_reserve_fuel"("tank_id", "tank_type");

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_source_mrn_idx" ON "tank_reserve_fuel"("source_mrn");

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_is_dispensed_idx" ON "tank_reserve_fuel"("is_dispensed");

-- CreateIndex
CREATE INDEX "tank_reserve_fuel_created_at_idx" ON "tank_reserve_fuel"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rezervoari_id_broj_key" ON "rezervoari"("id_broj");

-- CreateIndex
CREATE UNIQUE INDEX "plan_kalibracije_identifikacijski_broj_key" ON "plan_kalibracije"("identifikacijski_broj");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleImage" ADD CONSTRAINT "VehicleImage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalDocument" ADD CONSTRAINT "TechnicalDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterDocument" ADD CONSTRAINT "FilterDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoseDocument" ADD CONSTRAINT "HoseDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelIntakeDocuments" ADD CONSTRAINT "FuelIntakeDocuments_fuel_intake_record_id_fkey" FOREIGN KEY ("fuel_intake_record_id") REFERENCES "FuelIntakeRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedTankTransfers" ADD CONSTRAINT "FixedTankTransfers_affected_fixed_tank_id_fkey" FOREIGN KEY ("affected_fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedTankTransfers" ADD CONSTRAINT "FixedTankTransfers_counterparty_fixed_tank_id_fkey" FOREIGN KEY ("counterparty_fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedTankTransfers" ADD CONSTRAINT "FixedTankTransfers_fuel_intake_record_id_fkey" FOREIGN KEY ("fuel_intake_record_id") REFERENCES "FuelIntakeRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTankRefills" ADD CONSTRAINT "MobileTankRefills_source_fixed_tank_id_fkey" FOREIGN KEY ("source_fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTankRefills" ADD CONSTRAINT "MobileTankRefills_target_mobile_tank_id_fkey" FOREIGN KEY ("target_mobile_tank_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValveTestRecord" ADD CONSTRAINT "ValveTestRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTankRefill" ADD CONSTRAINT "FuelTankRefill_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelReceipt" ADD CONSTRAINT "FuelReceipt_fixedStorageTankId_fkey" FOREIGN KEY ("fixedStorageTankId") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelReceipt" ADD CONSTRAINT "FuelReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransferToTanker" ADD CONSTRAINT "FuelTransferToTanker_sourceFixedStorageTankId_fkey" FOREIGN KEY ("sourceFixedStorageTankId") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransferToTanker" ADD CONSTRAINT "FuelTransferToTanker_targetFuelTankId_fkey" FOREIGN KEY ("targetFuelTankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTransferToTanker" ADD CONSTRAINT "FuelTransferToTanker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDrainRecord" ADD CONSTRAINT "FuelDrainRecord_sourceFixedTankId_fkey" FOREIGN KEY ("sourceFixedTankId") REFERENCES "FixedStorageTanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDrainRecord" ADD CONSTRAINT "FuelDrainRecord_sourceMobileTankId_fkey" FOREIGN KEY ("sourceMobileTankId") REFERENCES "FuelTank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDrainRecord" ADD CONSTRAINT "FuelDrainRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachedDocument" ADD CONSTRAINT "AttachedDocument_fuelReceiptId_fkey" FOREIGN KEY ("fuelReceiptId") REFERENCES "FuelReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachedDocument" ADD CONSTRAINT "AttachedDocument_fuelingOperationId_fkey" FOREIGN KEY ("fuelingOperationId") REFERENCES "FuelingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingOperation" ADD CONSTRAINT "FuelingOperation_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingOperation" ADD CONSTRAINT "FuelingOperation_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingOperation" ADD CONSTRAINT "FuelingOperation_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelPriceRule" ADD CONSTRAINT "FuelPriceRule_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankFuelByCustoms" ADD CONSTRAINT "TankFuelByCustoms_fixed_tank_id_fkey" FOREIGN KEY ("fixed_tank_id") REFERENCES "FixedStorageTanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankFuelByCustoms" ADD CONSTRAINT "TankFuelByCustoms_fuel_intake_record_id_fkey" FOREIGN KEY ("fuel_intake_record_id") REFERENCES "FuelIntakeRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTankCustoms" ADD CONSTRAINT "MobileTankCustoms_mobile_tank_id_fkey" FOREIGN KEY ("mobile_tank_id") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrnTransactionLeg" ADD CONSTRAINT "MrnTransactionLeg_mobileTankCustomsId_fkey" FOREIGN KEY ("mobileTankCustomsId") REFERENCES "MobileTankCustoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrnTransactionLeg" ADD CONSTRAINT "MrnTransactionLeg_tankFuelByCustomsId_fkey" FOREIGN KEY ("tankFuelByCustomsId") REFERENCES "TankFuelByCustoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelOperationLog" ADD CONSTRAINT "FuelOperationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XmlInvoiceDispatch" ADD CONSTRAINT "XmlInvoiceDispatch_fuelingOperationId_fkey" FOREIGN KEY ("fuelingOperationId") REFERENCES "FuelingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XmlInvoiceDispatch" ADD CONSTRAINT "XmlInvoiceDispatch_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailInvoiceDispatch" ADD CONSTRAINT "EmailInvoiceDispatch_fuelingOperationId_fkey" FOREIGN KEY ("fuelingOperationId") REFERENCES "FuelingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailInvoiceDispatch" ADD CONSTRAINT "EmailInvoiceDispatch_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

