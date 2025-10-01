# Database Fields Used in Vehicles Components

This document lists all database fields used in the frontend components located in `/frontend/src/components/vehicles/`.

## Vehicle Model Fields

### Basic Information
- `id` - Vehicle ID
- `vehicle_name` - Vehicle name
- `license_plate` - License plate number
- `chassis_number` - Chassis number
- `vessel_plate_no` - Vessel plate number
- `status` - Vehicle status
- `notes` - General notes
- `image_url` - Main vehicle image URL

### Registration and Legal
- `registrovano_do` - Registration valid until
- `adr_vazi_do` - ADR certificate valid until
- `periodicni_pregled_vazi_do` - Periodic inspection valid until
- `licenca_datum_izdavanja` - License issue date
- `licenca_vazi_do` - License valid until
- `datum_isteka_cwd` - CWD expiry date

### Company and Location Relations
- `companyId` - Company ID (relation)
- `locationId` - Location ID (relation)
- `responsible_person_contact` - Responsible person contact

### Technical Specifications
- `year_of_manufacture` - Year of manufacture
- `fuel_type` - Fuel type
- `seat_count` - Number of seats
- `truck_type` - Truck type
- `chassis_manufacturer` - Chassis manufacturer
- `chassis_type` - Chassis type
- `body_manufacturer` - Body manufacturer
- `body_type` - Body type
- `axle_count` - Number of axles
- `carrying_capacity_kg` - Carrying capacity in kg
- `engine_power_kw` - Engine power in kW
- `engine_displacement_ccm` - Engine displacement in ccm
- `euro_norm` - Euro norm
- `flow_rate` - Flow rate

### Vehicle Type and Description
- `vehicle_type` - Type of vehicle
- `vehicle_description` - Vehicle description
- `fueling_type` - Fueling type
- `loading_type` - Loading type
- `supported_fuel_types` - Supported fuel types

### Tanker Specifications
- `kapacitet_cisterne` - Tank capacity
- `tanker_compartments` - Number of tanker compartments
- `tanker_type` - Tanker type
- `tanker_material` - Tanker material
- `tanker_last_pressure_test_date` - Last pressure test date
- `tanker_next_pressure_test_date` - Next pressure test date
- `tanker_last_fire_safety_test_date` - Last fire safety test date
- `tanker_next_fire_safety_test_date` - Next fire safety test date
- `cisterna_zadnja_kalibracija` - Last tanker calibration
- `cisterna_naredna_kalibracija` - Next tanker calibration

### Filter Data
- `filter_installed` - Filter installed status
- `filter_installation_date` - Filter installation date
- `filter_expiry_date` - Filter expiry date
- `filter_standard` - Filter standard
- `filter_replacement_date` - Filter replacement date
- `filter_type_plate_no` - Filter type plate number
- `filter_vessel_type` - Filter vessel type
- `tip_filtera` - Filter type
- `filter_cartridge_type` - Filter cartridge type
- `filter_separator_type` - Filter separator type
- `filter_ews` - Filter EWS
- `filter_safety_valve` - Filter safety valve
- `filter_vent_valve` - Filter vent valve
- `sensor_technology` - Sensor technology
- `filter_validity_period_months` - Filter validity period in months
- `filter_vessel_number` - Filter vessel number
- `filter_annual_inspection_date` - Filter annual inspection date
- `filter_next_annual_inspection_date` - Filter next annual inspection date
- `filter_ew_sensor_inspection_date` - Filter EW sensor inspection date

### Hose Data
- `underwing_hose_standard` - Underwing hose standard
- `underwing_hose_type` - Underwing hose type
- `underwing_hose_size` - Underwing hose size
- `underwing_hose_length` - Underwing hose length
- `underwing_hose_diameter` - Underwing hose diameter
- `underwing_hose_production_date` - Underwing hose production date
- `underwing_hose_installation_date` - Underwing hose installation date
- `underwing_hose_lifespan` - Underwing hose lifespan
- `underwing_hose_test_date` - Underwing hose test date
- `overwing_hose_standard` - Overwing hose standard
- `overwing_hose_type` - Overwing hose type
- `overwing_hose_size` - Overwing hose size
- `overwing_hose_length` - Overwing hose length
- `overwing_hose_diameter` - Overwing hose diameter
- `overwing_hose_production_date` - Overwing hose production date
- `overwing_hose_installation_date` - Overwing hose installation date
- `overwing_hose_lifespan` - Overwing hose lifespan
- `overwing_hose_test_date` - Overwing hose test date
- `crijeva_za_tocenje` - Hoses for fueling
- `broj_crijeva_hd63` - HD63 hose number
- `godina_proizvodnje_crijeva_hd63` - HD63 hose production year
- `datum_testiranja_pritiska_crijeva_hd63` - HD63 hose pressure test date
- `broj_crijeva_hd38` - HD38 hose number
- `godina_proizvodnje_crijeva_hd38` - HD38 hose production year
- `datum_testiranja_pritiska_crijeva_hd38` - HD38 hose pressure test date
- `broj_crijeva_tw75` - TW75 hose number
- `godina_proizvodnje_crijeva_tw75` - TW75 hose production year
- `datum_testiranja_pritiska_crijeva_tw75` - TW75 hose pressure test date

### Maintenance and Inspection Dates
- `last_6_month_check_date` - Last 6-month check date
- `next_6_month_check_date` - Next 6-month check date
- `last_hecpv_ilcpv_test_date` - Last HECPV/ILCPV test date
- `next_hecpv_ilcpv_test_date` - Next HECPV/ILCPV test date
- `last_hose_leak_test_date` - Last hose leak test date
- `next_hose_leak_test_date` - Next hose leak test date
- `last_hose_hd63_replacement_date` - Last HD63 hose replacement date
- `next_hose_hd63_replacement_date` - Next HD63 hose replacement date
- `last_hose_hd38_replacement_date` - Last HD38 hose replacement date
- `next_hose_hd38_replacement_date` - Next HD38 hose replacement date
- `last_hose_tw75_replacement_date` - Last TW75 hose replacement date
- `next_hose_tw75_replacement_date` - Next TW75 hose replacement date
- `tromjesecni_pregled_datum` - Quarterly inspection date
- `tromjesecni_pregled_vazi_do` - Quarterly inspection valid until

### Calibration Dates
- `last_volumeter_calibration_date` - Last volumeter calibration date
- `next_volumeter_calibration_date` - Next volumeter calibration date
- `last_manometer_calibration_date` - Last manometer calibration date
- `next_manometer_calibration_date` - Next manometer calibration date
- `tahograf_zadnja_kalibracija` - Last tachograph calibration
- `tahograf_naredna_kalibracija` - Next tachograph calibration
- `datum_kalibracije_hidrometra` - Hydrometer calibration date
- `datum_kalibracije_moment_kljuca` - Torque wrench calibration date
- `datum_kalibracije_termometra` - Thermometer calibration date
- `datum_kalibracije_uredjaja_elektricne_provodljivosti` - Electrical conductivity device calibration date
- `manometer_calibration_date` - Manometer calibration date
- `manometer_calibration_valid_until` - Manometer calibration valid until
- `volumeter_kalibracija_datum` - Volumeter calibration date
- `volumeter_kalibracija_vazi_do` - Volumeter calibration valid until
- `water_chemical_test_date` - Water chemical test date
- `water_chemical_test_valid_until` - Water chemical test valid until
- `torque_wrench_calibration_date` - Torque wrench calibration date
- `torque_wrench_calibration_valid_until` - Torque wrench calibration valid until
- `thermometer_calibration_date` - Thermometer calibration date
- `thermometer_calibration_valid_until` - Thermometer calibration valid until
- `hydrometer_calibration_date` - Hydrometer calibration date
- `hydrometer_calibration_valid_until` - Hydrometer calibration valid until
- `conductivity_meter_calibration_date` - Conductivity meter calibration date
- `conductivity_meter_calibration_valid_until` - Conductivity meter calibration valid until
- `resistance_meter_calibration_date` - Resistance meter calibration date
- `resistance_meter_calibration_valid_until` - Resistance meter calibration valid until
- `main_flow_meter_calibration_date` - Main flow meter calibration date
- `main_flow_meter_calibration_valid_until` - Main flow meter calibration valid until

### Timestamps
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Related Model Fields

### Company Model
- `id` - Company ID
- `name` - Company name

### Location Model
- `id` - Location ID
- `name` - Location name

### VehicleImage Model
- `id` - Image ID
- `imageUrl` - Image URL
- `vehicleId` - Associated vehicle ID
- `uploadedAt` - Upload timestamp
- `isMainImage` - Main image flag

### TechnicalDocument Model
- `id` - Document ID
- `title` - Document title
- `fileUrl` - Document file URL
- `documentType` - Document type
- `uploadedAt` - Upload timestamp
- `vehicleId` - Associated vehicle ID

### FilterDocument Model
- `id` - Document ID
- `title` - Document title
- `fileUrl` - Document file URL
- `documentType` - Document type
- `uploadedAt` - Upload timestamp
- `vehicleId` - Associated vehicle ID

### HoseDocument Model
- `id` - Document ID
- `title` - Document title
- `fileUrl` - Document file URL
- `documentType` - Document type
- `uploadedAt` - Upload timestamp
- `vehicleId` - Associated vehicle ID

### ServiceRecord Model
- `id` - Service record ID
- `vehicleId` - Associated vehicle ID
- `serviceDate` - Service date
- `description` - Service description
- `category` - Service category
- `documentUrl` - Associated document URL
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### ServiceItem Model
- `id` - Service item ID
- `serviceRecordId` - Associated service record ID
- `type` - Service item type
- `description` - Service item description
- `replaced` - Replacement flag
- `currentDate` - Current date
- `nextDate` - Next service date
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### ValveTestRecord Model
- `id` - Test record ID
- `vehicleId` - Associated vehicle ID
- `testType` - Test type
- `testDate` - Test date
- `vehicleNumber` - Vehicle number
- `fuelHoseType` - Fuel hose type
- `fuelHoseProductionDate` - Fuel hose production date
- `maxFlowRate` - Maximum flow rate
- `pressureReading` - Pressure reading
- `maxPressureDuringClosing` - Maximum pressure during closing
- `pressureAtZeroFlow` - Pressure at zero flow
- `pressureAfterThirtySeconds` - Pressure after thirty seconds
- `pressureIncrease` - Pressure increase
- `notes` - Test notes
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Additional Frontend-Only Fields (ValveTestRecord)

The following fields are used in the frontend but may not be explicitly defined in the database schema:

- `preparationTestPressureAtZero` - Preparation test pressure at zero
- `preparationTestPressureReading` - Preparation test pressure reading
- `hecpvSurgeControlMaxFlowRate` - HECPV surge control max flow rate
- `hecpvSurgeControlMaxPressure` - HECPV surge control max pressure
- `hecpvSurgeControlPressureReading` - HECPV surge control pressure reading
- `hecpvSlowlyTestFlowRate` - HECPV slowly test flow rate
- `hecpvSlowlyTestMaxPressure` - HECPV slowly test max pressure
- `hecpvSlowlyTestPressureAtNoFlow` - HECPV slowly test pressure at no flow
- `hecpvSlowlyTestCreepTestPressure` - HECPV slowly test creep test pressure
- `ilpcvRecordFlowRate` - ILPCV record flow rate
- `ilpcvRecordMaxPressure` - ILPCV record max pressure
- `ilpcvRecordPressureAtNoFlow` - ILPCV record pressure at no flow
- `ilpcvRecordCreepTestPressure` - ILPCV record creep test pressure
- `nextTestDate` - Next test date
- `placeOfPerformedTest` - Place of performed test
- `controlPerformedBy` - Control performed by
- `approvedControlBy` - Approved control by
- `hecpvTestPressure` - HECPV test pressure
- `hecpvTestPressureGauge` - HECPV test pressure gauge
- `hecpvSurgeControlSetPressure` - HECPV surge control set pressure
- `hecpvSurgeControlGauge` - HECPV surge control gauge
- `hecpvSurgeControlTestResult` - HECPV surge control test result

## Summary

This analysis covers all database fields used across the vehicles components in the frontend. The fields are organized by their respective models and include both direct database fields and related model fields accessed through relationships. Some fields used in the frontend (particularly in ValveTestRecord) may be stored as JSON or mapped to other fields in the backend database.








