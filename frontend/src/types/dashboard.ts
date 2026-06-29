/**
 * dashboard.ts
 * Type definitions for Dashboard KPI metrics
 */

// Dnevna potrošnja goriva
export interface DailyConsumptionData {
  liters: number;
  kg: number;
  loading: boolean;
  error: string | null;
}

// Sedmična potrošnja sa trendom
export interface WeeklyConsumptionData {
  average: number; // Prosjek sedmične potrošnje (litara)
  trend: number; // Procenat promjene (+/-)
  loading: boolean;
  error: string | null;
}

// Najbolja destinacija po potrošnji
export interface TopDestinationData {
  name: string;
  volume: number; // Ukupna količina (litara)
  percentage: number; // Procenat od ukupne potrošnje
  loading: boolean;
  error: string | null;
}

// Realizacija operacija
export interface FlightRealizationData {
  scheduled: number; // Planirane operacije
  realized: number; // Realizovane operacije
  rate: number; // Procenat realizacije
  unplanned: number; // Neplanirane operacije
  loading: boolean;
  error: string | null;
}

// Kombinovani state za sve KPI metrike
export interface DashboardKPIData {
  dailyConsumption: DailyConsumptionData;
  weeklyConsumption: WeeklyConsumptionData;
  topDestination: TopDestinationData;
  flightRealization: FlightRealizationData;
}
