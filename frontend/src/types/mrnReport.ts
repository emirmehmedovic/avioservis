import { FuelType } from '@/types/fuel';

export interface MrnReportBalance {
  totalIntakeLiters: number;
  totalOutflowLiters: number;
  totalDrainedLiters: number;
  remainingLiters: number;
  totalOutflowKg?: number;
  remainingKg?: number;
  accumulatedLiterVariance?: number;
  averageDensity?: number;
}

// Sučelje za transakcije koje dolaze iz backend transactionHistory
export interface FuelOperation {
  id: number | string; 
  // Osnovna polja za transakcije, može doći iz različitih izvora
  date?: string; // Timestamp kao string (stari format)
  dateTime?: string | Date | null; // Alternativno za date (novi format)
  transactionType: string; 
  
  // Polja za količine i gustoće - prilagođeno različitim izvorima
  kgTransacted?: number | null; // MrnTransactionLeg format
  litersTransacted?: number | null; // MrnTransactionLeg format
  litersTransactedActual?: number | null; // Iz MrnTransactionLeg
  quantity_liters?: number | null; // Stari format za litersTransacted
  quantity_kg?: number | null; // Stari format za kgTransacted
  
  // Polja za gustoće
  density?: number | null; // Novi format
  specific_density?: number | null; // Stari format za density
  operationalDensityUsed?: number | null; // Iz MrnTransactionLeg
  
  // MRN identifikatori i breakdown
  customsDeclaration?: string | null;
  mrnBreakdown?: string | null; 
  literVarianceForThisLeg?: number | null; // Iz MrnTransactionLeg
  
  // Podaci o zrakoplovu i aviokompaniji
  aircraft_registration?: string | null;
  aircraftRegistration?: string | null; // Alternativno ime za aircraft_registration
  airline?: { name: string } | null;
  airlineName?: string | null; // Alternativni pristup za airline.name
  
  // Podaci o letu
  destination?: string | null;
  flight_number?: string | null;
  
  // Podaci o dostavnici/dokumentima
  delivery_note_number?: string | null;
  deliveryNoteNumber?: string | null; // Alternativa za delivery_note_number
  
  // Operativni podaci
  operator_name?: string | null;
  
  // Napomene
  notes?: string | null;
  
  // Financijski podaci
  price_per_kg?: number | null;
  currency?: string | null;
  
  // Podaci o tipu operacije i opremi
  traffic_type?: string | null;
  transport_type?: string | null;
}

export interface FuelIntakeReportFilters {
  fuel_type: FuelType | 'all';
  startDate: string;
  endDate: string;
  customs_declaration_number: string;
  refinery_name: string;
  currency: string;
  fuel_category: string;
}

export interface MrnReportData {
  intake: any;
  transactionHistory: FuelOperation[];
  drainedFuel: any[];
  balance: {
    totalIntakeLiters: number;
    totalOutflowKg: number;
    totalOutflowLiters: number;
    remainingKg: number;
    remainingLiters: number;
    accumulatedLiterVariance: number;
    averageDensity: number;
  };
}
