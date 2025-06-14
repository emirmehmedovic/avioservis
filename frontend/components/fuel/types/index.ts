// Types and interfaces for the fueling operations module

export interface FuelTankFE {
  id: number;
  identifier: string;
  name: string;
  current_liters: number;
  location?: string;
  capacity_liters?: number;
  fuel_type?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AirlineFE {
  id: number;
  name: string;
  operatingDestinations?: string[];
}

export interface VehicleFE {
  id: number;
  vehicle_name: string;
  license_plate: string;
}

export interface AttachedDocumentFE {
  originalFilename: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface FuelingOperationDocument {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedAt: string;
  fuelReceiptId: number | null;
  fuelingOperationId: number;
  aircraftId?: number | null;
  aircraft?: VehicleFE | null;
}

export interface FuelingOperation {
  id: number;
  dateTime: string;
  aircraft_registration: string | null;
  airlineId: number;
  airline: AirlineFE;
  destination: string;
  quantity_liters: number;
  specific_density?: number;
  quantity_kg?: number;
  price_per_kg?: number;
  currency?: string;
  total_amount?: number;
  tankId: number;
  tank: {
    id: number;
    identifier: string;
    name: string;
    location: string;
    capacity_liters: number;
    current_liters: number;
    fuel_type: string;
    createdAt: string;
    updatedAt: string;
  };
  flight_number?: string | null;
  operator_name: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  tip_saobracaja?: string | null;
  documents?: FuelingOperationDocument[];
  aircraftId?: number | null;
  aircraft?: VehicleFE | null;
}

export interface FuelingOperationsApiResponse {
  operations: FuelingOperation[];
  totalLiters: number;
}

export interface FuelingOperationFormData {
  dateTime: string;
  aircraft_registration: string;
  airlineId: string;
  destination: string;
  quantity_liters: number;
  specific_density: number;
  quantity_kg: number;
  price_per_kg: number;
  currency: string;
  total_amount: number;
  tankId: string;
  flight_number: string;
  operator_name: string;
  notes: string;
  tip_saobracaja: string;
}
