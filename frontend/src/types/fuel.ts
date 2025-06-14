export enum FuelType {
  DIESEL = 'Dizel',
  BMB95 = 'Benzin BMB95',
  JET_A1 = 'Jet A-1',
  AVGAS_100LL = 'Avgas 100LL',
  // Add other relevant fuel types here
}

export enum FuelCategory {
  EXPORT = "Izvoz",
  DOMESTIC = "Domaće tržište",
}

export enum Currency {
  BAM = "BAM",
  EUR = "EUR",
  USD = "USD",
}

export enum FixedTankStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export interface FixedStorageTank {
  id: number;
  tank_name: string;
  tank_identifier: string;
  capacity_liters: number;
  current_quantity_liters: number;
  fuel_type: string;
  location_description: string | null;
  status: string;
  identificationDocumentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Represents a single transaction in the history of a fixed tank
export interface TankTransaction {
  id: string; // Backend generates string IDs like 'intake-123'
  transaction_datetime: string; // ISO date-time string from backend
  type: 'intake' | 'transfer_to_mobile' | 'adjustment_plus' | 'adjustment_minus' | 'fuel_drain' | 'internal_transfer_in' | 'internal_transfer_out' | string; // Transaction type from backend
  quantityLiters: number; // Quantity from backend
  relatedDocument?: string | null; // From backend
  sourceOrDestination?: string | null; // From backend, can be tank name or vehicle ID
  notes?: string | null;
  tankName?: string;      // Name of the tank involved in the transaction
  user?: string;          // User associated with the transaction
}

// Represents a single transaction in the history of a mobile tank (aircraft tanker)
export interface MobileTankTransaction {
  id: number;
  transaction_datetime: string; // ISO date-time string
  type: 'supplier_refill' | 'fixed_tank_transfer' | 'aircraft_fueling' | 'adjustment' | string;
  quantity_liters: number;
  source_name?: string; // For fixed_tank_transfer: name of the fixed tank
  source_id?: number;   // For fixed_tank_transfer: ID of the fixed tank
  destination_name?: string; // For aircraft_fueling: aircraft registration or flight number
  destination_id?: number;   // For aircraft_fueling: operation ID
  supplier_name?: string;    // For supplier_refill: name of the supplier
  invoice_number?: string;   // For supplier_refill: invoice number
  price_per_liter?: number;  // For supplier_refill: price per liter
  notes?: string;
  user?: string;             // User who performed the transaction
}

// Corresponds to Prisma Model FuelIntakeDocuments
export interface FuelIntakeDocument {
  id: number;
  fuel_intake_record_id: number;
  document_name: string;
  document_path: string;
  document_type: string;
  file_size_bytes: number;
  mime_type: string;
  uploaded_at: string; // ISO date-time string
}

// Corresponds to Prisma Model FixedTankTransfers
// This might be slightly different from TankTransaction if used directly
// For now, TankTransaction covers the history view well.
// We can define a more direct FixedTankTransferType if needed for other contexts.
export interface FixedTankTransfer {
  id: number;
  fuel_intake_record_id: number;
  affected_fixed_tank_id: number; 
  quantity_liters_transferred: number;
  transfer_datetime: string; // ISO date-time string
  notes?: string | null;
  affectedFixedTank?: Pick<FixedStorageTank, 'tank_name' | 'tank_identifier'>; 
}

// Corresponds to Prisma Model FuelIntakeRecords
export interface FuelIntakeRecord {
  id: number;
  delivery_vehicle_plate: string;
  delivery_vehicle_driver_name?: string | null;
  intake_datetime: string; // ISO date-time string
  quantity_liters_received: number;
  quantity_kg_received: string; // Backend sends as string, parse in frontend
  specific_gravity: number;
  fuel_type: FuelType; // Assuming FuelType enum can be used here
  fuel_category: FuelCategory; // New field for category (Izvoz/Domaće tržište)
  refinery_name?: string | null; // New field for refinery name
  supplier_name?: string | null;
  delivery_note_number?: string | null;
  customs_declaration_number?: string | null;
  price_per_kg?: number | null; // Price per kilogram
  currency?: Currency | null; // Currency (BAM, EUR, USD)
  total_price?: number | null; // Total price calculated as price_per_kg * quantity_kg_received
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  documents?: FuelIntakeDocument[];      // Included by backend controller
  fixedTankTransfers?: FixedTankTransfer[]; // Included by backend controller
}

// Filters for fetching FuelIntakeRecords
export interface FuelIntakeFilters {
  fuel_type?: FuelType | string; // Allow string for 'all' or specific enum value
  fuel_category?: FuelCategory | string; // Allow string for 'all' or specific enum value
  refinery_name?: string; // Filter by refinery name
  supplier_name?: string;
  delivery_vehicle_plate?: string;
  startDate?: string; // ISO date string or YYYY-MM-DD
  endDate?: string;   // ISO date string or YYYY-MM-DD
  // Add other potential filters like customs_declaration_number if needed
}

// Payload for creating a new Fuel Intake Record
export interface CreateFuelIntakePayload {
  delivery_vehicle_plate: string;
  delivery_vehicle_driver_name?: string | null;
  intake_datetime: string; // ISO date-time string
  quantity_liters_received: number;
  quantity_kg_received: number;
  specific_gravity: number;
  fuel_type: string; // Fuel type as string (e.g., 'DIESEL', 'JET_A1')
  fuel_category: string; // Category as string (e.g., 'Izvoz', 'Domaće tržište')
  refinery_name?: string | null; // New field for refinery name
  supplier_name?: string | null;
  delivery_note_number?: string | null;
  customs_declaration_number?: string | null;
  tank_distributions: Array<{
    tank_id: number; // Corresponds to fixed_storage_tank_id in FixedTankTransfers model
    quantity_liters: number; // Corresponds to quantity_liters_transferred
    // transfer_datetime will be set by backend (DEFAULT NOW() or from intake_datetime)
    // notes are optional and not currently captured in the wizard's TankDistributionData
  }>;
}

// --- Airline and Fuel Price Rules --- //

export interface Airline {
  id: number;
  name: string;
  // Add other airline-specific fields if they exist or become necessary
  // e.g., iata_code, icao_code
}

export interface FuelPriceRule {
  id: number;
  airlineId: number;
  price: number; // Assuming price is a number
  currency: string; // e.g., "USD", "EUR", "BAM"
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  airline?: Airline; // Optional: if the backend joins airline data
}

export interface CreateFuelPriceRulePayload {
  airlineId: number;
  price: number;
  currency: string;
}

export interface UpdateFuelPriceRulePayload {
  price?: number; // Price is optional for update
  currency?: string; // Currency is optional for update
}
