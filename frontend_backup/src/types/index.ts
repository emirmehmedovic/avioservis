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
  FUEL_USER = 'FUEL_USER',
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
  uploadedAt?: string | Date; // Opciono, ako ga šaljemo na frontend
}

// Based on VehicleData from apiService.ts
export interface Vehicle {
  id: number; 
  vehicle_name: string;
  license_plate: string;
  status: VehicleStatus; 
  companyId: number;
  locationId: number; 
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
  responsible_person_contact?: string | null;
  created_at?: string; 
  updated_at?: string; 
  images?: VehicleImage[]; // Niz slika povezanih sa vozilom
}

export interface Company {
  id: number;
  name: string;
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
  FILTER = 'FILTER',
  HOSE_HD63 = 'HOSE_HD63',
  HOSE_HD38 = 'HOSE_HD38',
  HOSE_TW75 = 'HOSE_TW75',
  HOSE_LEAK_TEST = 'HOSE_LEAK_TEST',
  VOLUMETER = 'VOLUMETER',
  MANOMETER = 'MANOMETER',
  HECPV_ILCPV = 'HECPV_ILCPV',
  SIX_MONTH_CHECK = 'SIX_MONTH_CHECK',
  ENGINE = 'ENGINE',
  BRAKES = 'BRAKES',
  TRANSMISSION = 'TRANSMISSION',
  ELECTRICAL = 'ELECTRICAL',
  TIRES = 'TIRES',
  OTHER = 'OTHER'
}

// Interface for service items included in a service record
export interface ServiceItem {
  type: ServiceItemType;
  description?: string;
  replaced?: boolean;
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
