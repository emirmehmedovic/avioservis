// frontend/src/components/fuel/types.ts

// From FuelProjections.tsx
export interface ProjectionInputRow {
  id: string;
  airlineId: string;
  destination: string;
  operations: number;
  availableDestinations: string[];
}

export interface ProjectionResult {
  airlineName: string;
  destination: string;
  averageFuelPerOperation: number;
  operationsPerMonth: number;
  monthlyConsumption: number;
  quarterlyConsumption: number;
  yearlyConsumption: number;
  operationsAnalyzed: number;
}

export interface TotalProjection {
  monthly: number;
  quarterly: number;
  yearly: number;
}

// From fuelingOperationsService.ts (or to be defined here)
export interface FuelProjectionPresetData {
  airlineId: string;
  destination: string;
  operations: number;
}

export interface CalculatedResultsData {
  projectionResults: ProjectionResult[];
  totalProjection: TotalProjection | null;
  inputs?: ProjectionInputRow[]; 
}

export interface FullFuelProjectionPreset {
  id: number;
  name: string;
  description?: string | null;
  presetData: FuelProjectionPresetData[];
  calculatedResultsData?: CalculatedResultsData | null;
  createdAt: string;
  updatedAt: string;
}

// Placeholder/Basic definitions for other types used in this module
// Ideally, these should be accurately defined based on your API and data structures
export interface AirlineFE {
  id: number;
  name: string;
  operatingDestinations?: string[];
  address?: string;
  taxId?: string;
  contact_details?: string;
  // ... other properties
}

export interface FuelTankFE {
  id: number;
  name: string;
  identifier: string;
  current_liters?: number;
  current_kg?: number;
  fuel_type?: string;
  avg_density?: number; // Prosječna gustoća goriva u tanku
  // ... other properties
}

export interface FuelingOperation {
  id: number;
  quantity_liters?: number;
  delivery_note_number?: string | null;
  dateTime: string;
  aircraft_registration?: string;
  airline?: AirlineFE;
  airlineId?: string | number; // Added for xmlInvoice.ts
  destination?: string;
  tank?: FuelTankFE;
  tankId?: number;
  flight_number?: string;
  operator_name?: string;
  notes?: string;
  tip_saobracaja?: string;
  specific_density?: number;
  quantity_kg?: number;
  price_per_kg?: number;
  discount_percentage?: number;
  currency?: string;
  total_amount?: number;
  createdAt?: string;
  updatedAt?: string;
  mrnBreakdown?: string; // Dodano za praćenje MRN podataka u operacijama točenja
  parsedMrnBreakdown?: Array<{ mrn: string; quantity_liters?: number; quantity_kg?: number; [key: string]: any }>; // Dodano za parsirane MRN podatke s backenda, usklađeno s ConsolidatedReportExport.tsx
  aircraft?: { // Added for OperationDetailsModal.tsx
    registration?: string;
    type?: string;
  };
  documents?: Array<{
    id: number;
    name: string;
    url: string;
    type?: string;
    size?: number;
  }>;
}

export interface FuelingOperationsApiResponse {
  operations: FuelingOperation[];
  totalLiters: number;
  // ... other properties like pagination details if any
}

// Form data interface for fueling operations
export interface FuelingOperationFormData {
  dateTime: string;
  aircraft_registration: string;
  airlineId: string;
  destination: string;
  quantity_liters: number;
  specific_density: number;
  quantity_kg: number;
  price_per_kg: number;
  discount_percentage: number;
  currency: string;
  total_amount: number;
  tankId: string;
  flight_number: string;
  operator_name: string;
  notes: string;
  tip_saobracaja: string;
  delivery_note_number: string;
}
