// Base User type from AuthContext, can be extended here if needed
export interface User {
  id: number; 
  username: string;
  email?: string; 
  role: UserRole; 
  companyId?: number | null; 
  createdAt?: string; 
  updatedAt?: string; 
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SERVICER = 'SERVICER',
  FUEL_OPERATOR = 'FUEL_OPERATOR',
  KONTROLA = 'KONTROLA',
  CARINA = 'CARINA',      // New role for customs access
  AERODROM = 'AERODROM'   // New role for airport access
}

export type CreateUserPayload = Pick<User, 'username' | 'role'> & {
  password?: string; 
};

export type UpdateUserPayload = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> & {
  password?: string; 
};

export interface LoginResponse {
  token: string;
  user: User;
}

// Define VehicleStatus Enum
export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',         // Usklađeno sa Prisma
  MAINTENANCE = 'MAINTENANCE',   // Usklađeno sa Prisma
  OUT_OF_SERVICE = 'OUT_OF_SERVICE' // Usklađeno sa Prisma
}

// Interfejs za sliku vozila, prema Prisma šemi
export interface VehicleImage {
  id: number;
  imageUrl: string;
  vehicleId: number;
  isMainImage?: boolean;
  uploadedAt?: string | Date; // Opciono, ako ga šaljemo na frontend
}

// Based on VehicleData from apiService.ts
export interface Vehicle {
  id: number; 
  vehicle_name: string;
  license_plate: string;
  status: VehicleStatus; 
  companyId: number;
  company?: Company;
  locationId: number; 
  location?: Location;
  filter_installed: boolean; 
  chassis_number?: string | null;
  vessel_plate_no?: string | null;
  notes?: string | null;
  image_url?: string | null;
  filter_installation_date?: Date | null; 
  filter_validity_period_months?: number | null;
  filter_type_plate_no?: string | null;
  last_annual_inspection_date?: Date | null; 
  sensor_technology?: string | null;
  last_hose_hd63_replacement_date?: Date | null;
  next_hose_hd63_replacement_date?: Date | null;
  last_hose_hd38_replacement_date?: Date | null;
  next_hose_hd38_replacement_date?: Date | null;
  last_hose_tw75_replacement_date?: Date | null;
  next_hose_tw75_replacement_date?: Date | null;
  last_hose_leak_test_date?: Date | null;
  next_hose_leak_test_date?: Date | null;
  last_volumeter_calibration_date?: Date | null;
  next_volumeter_calibration_date?: Date | null;
  last_manometer_calibration_date?: Date | null;
  next_manometer_calibration_date?: Date | null;
  last_hecpv_ilcpv_test_date?: Date | null;
  next_hecpv_ilcpv_test_date?: Date | null;
  last_6_month_check_date?: Date | null;
  next_6_month_check_date?: Date | null;

  // New fields for tanker specifics and additional validity dates
  kapacitet_cisterne?: number | null;
  tip_filtera?: string | null;          // General filter type (e.g., cartridge, sock)
  crijeva_za_tocenje?: string | null;     // Hose type (e.g., "PODKRILNO", "NADKRILNO")
  registrovano_do?: Date | null;        // Vehicle registration valid until
  adr_vazi_do?: Date | null;            // ADR certificate valid until
  periodicni_pregled_vazi_do?: Date | string | null; // Date for API, string for form input
  
  // Nova polja za opis i specifikacije
  vehicle_description?: string | null;   // Tekstualni opis vozila
  supported_fuel_types?: string | null;  // Vrste goriva koje podržava
  euro_norm?: string | null;            // Euro norma
  flow_rate?: number | null;            // Protok (L/min)
  vehicle_type?: string | null;         // Tip (Refuler, Dispenser, Defuler)
  tanker_type?: string | null;          // Tip tanka
  fueling_type?: string | null;         // Vrsta punjenja (Nadkrilno, Podkrilno)
  loading_type?: string | null;         // Tip punjenja (Top, Bottom)
  truck_type?: string | null;           // Tip kamiona (Solo, Poluprikolica)
  
  // Polja za preglede i licence
  tromjesecni_pregled_datum?: Date | string | null;  // Datum tromjesečnog pregleda
  tromjesecni_pregled_vazi_do?: Date | string | null;  // Tromjesečni pregled važi do
  licenca_datum_izdavanja?: Date | string | null;  // Datum izdavanja licence
  licenca_vazi_do?: Date | string | null;  // Licenca važi do
  volumeter_kalibracija_datum?: Date | string | null;  // Datum kalibracije volumetra
  volumeter_kalibracija_vazi_do?: Date | string | null;  // Kalibracija volumetra važi do
  
  // Dodatna polja za filter
  filter_standard?: string | null;  // Standard filtriranja
  filter_vessel_type?: string | null;  // Tip posude
  filter_cartridge_type?: string | null;  // Tip uložaka
  filter_separator_type?: string | null;  // Tip separatora
  filter_ews?: string | null;  // EWS
  filter_safety_valve?: string | null;  // Sigurnosni ventil
  filter_vent_valve?: string | null;  // Ventil ozrake
  filter_replacement_date?: Date | string | null;  // Datum zamjene filtera

  // Dodatne informacije o cisterni
  tanker_compartments?: number | null;
  tanker_material?: string | null;
  tanker_last_pressure_test_date?: Date | string | null;
  tanker_next_pressure_test_date?: Date | string | null;
  tanker_last_fire_safety_test_date?: Date | string | null;
  tanker_next_fire_safety_test_date?: Date | string | null;

  // Enhanced Filter Information
  filter_vessel_number?: string | null;
  filter_annual_inspection_date?: Date | string | null;
  filter_next_annual_inspection_date?: Date | string | null;
  filter_ew_sensor_inspection_date?: Date | string | null;
  filter_expiry_date?: Date | string | null; // Datum isteka filtera

  // Hose Details
  broj_crijeva_hd63?: string | null;
  godina_proizvodnje_crijeva_hd63?: number | null;
  datum_testiranja_pritiska_crijeva_hd63?: Date | string | null;
  broj_crijeva_hd38?: string | null;
  godina_proizvodnje_crijeva_hd38?: number | null;
  datum_testiranja_pritiska_crijeva_hd38?: Date | string | null;
  broj_crijeva_tw75?: string | null;
  godina_proizvodnje_crijeva_tw75?: number | null;
  datum_testiranja_pritiska_crijeva_tw75?: Date | string | null;

  // Calibration Dates
  datum_kalibracije_moment_kljuca?: Date | string | null;
  datum_kalibracije_termometra?: Date | string | null;
  datum_kalibracije_hidrometra?: Date | string | null;
  datum_kalibracije_uredjaja_elektricne_provodljivosti?: Date | string | null;

  // CWD Expiry Date
  datum_isteka_cwd?: Date | string | null;

  // Fields for Technical Data section
  year_of_manufacture?: number | null;
  chassis_manufacturer?: string | null;
  chassis_type?: string | null;
  body_manufacturer?: string | null;
  body_type?: string | null;
  axle_count?: number | null;
  carrying_capacity_kg?: number | null;
  engine_power_kw?: number | null;
  engine_displacement_ccm?: number | null;
  seat_count?: number | null;
  fuel_type?: string | null;

  // Fields for Calibration section (specific calibrations)
  tahograf_zadnja_kalibracija?: Date | string | null;
  tahograf_naredna_kalibracija?: Date | string | null;
  cisterna_zadnja_kalibracija?: Date | string | null;
  cisterna_naredna_kalibracija?: Date | string | null;
  
  // Polja za crijeva - podkrilno punjenje
  underwing_hose_standard?: string | null;
  underwing_hose_type?: string | null;
  underwing_hose_size?: string | null;
  underwing_hose_length?: string | null;
  underwing_hose_diameter?: string | null;
  underwing_hose_production_date?: Date | string | null;
  underwing_hose_installation_date?: Date | string | null;
  underwing_hose_lifespan?: string | null;
  underwing_hose_test_date?: Date | string | null;
  
  // Polja za crijeva - nadkrilno punjenje
  overwing_hose_standard?: string | null;
  overwing_hose_type?: string | null;
  overwing_hose_size?: string | null;
  overwing_hose_length?: string | null;
  overwing_hose_diameter?: string | null;
  overwing_hose_production_date?: Date | string | null;
  overwing_hose_installation_date?: Date | string | null;
  overwing_hose_lifespan?: string | null;
  overwing_hose_test_date?: Date | string | null;
  
  // Polja za testove i kalibracije
  manometer_calibration_date?: Date | string | null;
  manometer_calibration_valid_until?: Date | string | null;
  
  // Polja za dodatne kalibracije i testove
  water_chemical_test_date?: Date | string | null;
  water_chemical_test_valid_until?: Date | string | null;
  torque_wrench_calibration_date?: Date | string | null;
  torque_wrench_calibration_valid_until?: Date | string | null;
  thermometer_calibration_date?: Date | string | null;
  thermometer_calibration_valid_until?: Date | string | null;
  hydrometer_calibration_date?: Date | string | null;
  hydrometer_calibration_valid_until?: Date | string | null;
  conductivity_meter_calibration_date?: Date | string | null;
  conductivity_meter_calibration_valid_until?: Date | string | null;
  resistance_meter_calibration_date?: Date | string | null;
  resistance_meter_calibration_valid_until?: Date | string | null;
  main_flow_meter_calibration_date?: Date | string | null;
  main_flow_meter_calibration_valid_until?: Date | string | null;

  responsible_person_contact?: string | null;
  created_at?: string; 
  updated_at?: string; 
  images?: VehicleImage[]; // Niz slika povezanih sa vozilom
  
  // Dokumenti povezani sa vozilom
  filterDocuments?: FilterDocument[];
  technicalDocuments?: TechnicalDocument[];
  hoseDocuments?: HoseDocument[];
}

export interface Company {
  id: number;
  name: string;
  taxId?: string;            // PDV broj
  city?: string;             // Mjesto
  address?: string;          // Adresa firme
  contactPersonName?: string; // Kontakt osoba
  contactPersonPhone?: string;// Broj telefona kontakt osobe
  vehicles?: Vehicle[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Location {
  id: number;
  name: string;
  address?: string | null;
  companyTaxId?: string | null;
  vehicles?: Vehicle[];
  createdAt?: string;
  updatedAt?: string;
}

// Type for creating a location, omitting id as it's auto-generated
export type CreateLocationPayload = Omit<Location, 'id' | 'vehicles' | 'createdAt' | 'updatedAt'>;

// Type for creating a vehicle, usually omits id, createdAt, updatedAt
export type CreateVehiclePayload = Omit<Vehicle, 'id' | 'company' | 'location' | 'created_at' | 'updated_at' | 'next_hose_hd63_replacement_date' | 'next_hose_hd38_replacement_date' | 'next_hose_tw75_replacement_date' | 'next_hose_leak_test_date' | 'next_volumeter_calibration_date' | 'next_manometer_calibration_date' | 'next_hecpv_ilcpv_test_date' | 'next_6_month_check_date'>;

// Extended CreateVehiclePayload to include image_url if needed during creation
export type CreateVehicleWithImagePayload = CreateVehiclePayload & { image_url?: string | null };

// Define ServiceRecordCategory Enum
export enum ServiceRecordCategory {
  REGULAR_MAINTENANCE = 'REGULAR_MAINTENANCE',
  REPAIR = 'REPAIR',
  TECHNICAL_INSPECTION = 'TECHNICAL_INSPECTION',
  FILTER_REPLACEMENT = 'FILTER_REPLACEMENT',
  HOSE_REPLACEMENT = 'HOSE_REPLACEMENT',
  CALIBRATION = 'CALIBRATION',
  OTHER = 'OTHER'
}

// Define ServiceItemType Enum - items that can be serviced
export enum ServiceItemType {
  // Existing hose types
  HOSE_HD63 = 'HOSE_HD63',
  HOSE_HD38 = 'HOSE_HD38',
  HOSE_TW75 = 'HOSE_TW75',
  HOSE_LEAK_TEST = 'HOSE_LEAK_TEST',
  
  // Calibration items
  VOLUMETER = 'VOLUMETER',
  MANOMETER = 'MANOMETER',
  HECPV_ILCPV = 'HECPV_ILCPV',
  SIX_MONTH_CHECK = 'SIX_MONTH_CHECK',
  
  // Filter related
  FILTER = 'FILTER',
  FILTER_ANNUAL_INSPECTION = 'FILTER_ANNUAL_INSPECTION',
  FILTER_EW_SENSOR_INSPECTION = 'FILTER_EW_SENSOR_INSPECTION',
  
  // Tanker related
  TANKER_PRESSURE_TEST = 'TANKER_PRESSURE_TEST',
  TANKER_FIRE_SAFETY_TEST = 'TANKER_FIRE_SAFETY_TEST',
  TANKER_CALIBRATION = 'TANKER_CALIBRATION',
  
  // Meter calibrations
  CONDUCTIVITY_METER_CALIBRATION = 'CONDUCTIVITY_METER_CALIBRATION',
  HYDROMETER_CALIBRATION = 'HYDROMETER_CALIBRATION',
  MAIN_FLOW_METER_CALIBRATION = 'MAIN_FLOW_METER_CALIBRATION',
  RESISTANCE_METER_CALIBRATION = 'RESISTANCE_METER_CALIBRATION',
  THERMOMETER_CALIBRATION = 'THERMOMETER_CALIBRATION',
  TORQUE_WRENCH_CALIBRATION = 'TORQUE_WRENCH_CALIBRATION',
  
  // Hose tests
  OVERWING_HOSE_TEST = 'OVERWING_HOSE_TEST',
  UNDERWING_HOSE_TEST = 'UNDERWING_HOSE_TEST',
  HD38_PRESSURE_TEST = 'HD38_PRESSURE_TEST',
  HD63_PRESSURE_TEST = 'HD63_PRESSURE_TEST',
  TW75_PRESSURE_TEST = 'TW75_PRESSURE_TEST',
  
  // Regular checks
  QUARTERLY_INSPECTION = 'QUARTERLY_INSPECTION',  // tromjesecni_pregled
  WATER_CHEMICAL_TEST = 'WATER_CHEMICAL_TEST',
  
  // Vehicle components
  TACHOGRAPH_CALIBRATION = 'TACHOGRAPH_CALIBRATION',  // tahograf_kalibracija
  ADR_CERTIFICATION = 'ADR_CERTIFICATION',  // adr_vazi_do
  CWD_EXPIRY = 'CWD_EXPIRY',  // datum_isteka_cwd
  
  // Standard vehicle service items
  ENGINE = 'ENGINE',
  BRAKES = 'BRAKES',
  TRANSMISSION = 'TRANSMISSION',
  ELECTRICAL = 'ELECTRICAL',
  TIRES = 'TIRES',
  
  // Work orders
  WORK_ORDER = 'WORK_ORDER',

  // Fallback
  OTHER = 'OTHER'
}

// Interface for service items included in a service record
export interface ServiceItem {
  type: ServiceItemType;
  description?: string;
  replaced?: boolean;
  currentDate?: Date | string | null;  // Current service/replacement date
  nextDate?: Date | string | null;     // Next scheduled service/replacement date
}

// Interface for service records
export interface ServiceRecord {
  id: number;
  vehicleId: number;
  serviceDate: Date | string;
  description: string;
  category: ServiceRecordCategory;
  documentUrl?: string | null;
  serviceItems: ServiceItem[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Type for creating a service record
export type CreateServiceRecordPayload = Omit<ServiceRecord, 'id' | 'createdAt' | 'updatedAt'>;

// Interfejs za tehničku dokumentaciju vozila
export interface TechnicalDocument {
  id: number;
  title: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: Date | string;
  vehicleId: number;
}

// Interfejs za dokumentaciju filtera
export interface FilterDocument {
  id: number;
  title: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: Date | string;
  vehicleId: number;
}

// Interfejs za dokumentaciju crijeva
export interface HoseDocument {
  id: number;
  title: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: Date | string;
  vehicleId: number;
}

// Napomena: Polja za dokumente su dodana u glavni Vehicle interfejs iznad
