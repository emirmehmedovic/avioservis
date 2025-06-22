import { fetchWithAuth } from '../lib/apiService';

// Tipovi za MRN profitabilnost
export interface MrnBreakdownItem {
  mrn: string;
  liters: number;
  kg: number;
}

export interface MrnProfitabilityItem {
  mrn: string;
  intakeDate: string;          // Umjesto purchaseDate
  quantity_liters: number;
  quantity_kg: number;
  initialQuantity?: number;    // Dodatno polje iz odgovora
  remainingQuantity?: number;  // Dodatno polje iz odgovora
  usedQuantity?: number;       // Dodatno polje iz odgovora
  cost: number;                // Umjesto totalCost
  revenue: number;             // Umjesto totalRevenue
  profit: number;
  margin: number;
}

export interface MrnProfitabilityReport {
  items: MrnProfitabilityItem[];
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageMargin: number;
    totalQuantityLiters: number;
    totalQuantityKg: number;
  };
}

// Tipovi za profitabilnost po destinaciji
export interface DestinationProfitabilityItem {
  destination: string;
  flightCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity_liters: number;
  quantity_kg: number;
}

// Tipovi za profitabilnost po aviokompaniji
export interface AirlineProfitabilityItem {
  airlineId: number;
  airlineName: string;
  flightCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity_liters: number;
  quantity_kg: number;
}

// Tipovi za mjesečni finansijski pregled
export interface MonthlyFinancialBreakdown {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantityLiters: number;
  quantityKg: number;
}

// Tip za ukupni finansijski izvještaj
export interface SummaryFinancialReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  totalQuantityLiters: number;
  totalQuantityKg: number;
  monthlyBreakdown: MonthlyFinancialBreakdown[];
  topDestinations: DestinationProfitabilityItem[];
  topAirlines: AirlineProfitabilityItem[];
}

// Tip za parametre datumskog filtera
export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

// Servis za dohvaćanje finansijskih izvještaja
class FinancialReportsService {
  // Dohvat izvještaja profitabilnosti po MRN
  async getMrnProfitabilityReport(params: DateRangeParams): Promise<MrnProfitabilityReport> {
    const queryParams = new URLSearchParams();
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    const url = `/api/reports/financial/mrn?${queryParams.toString()}`;
    const response = await fetchWithAuth<{report: MrnProfitabilityReport}>(url);
    return response.report;
  }

  // Dohvat izvještaja profitabilnosti po destinaciji
  async getDestinationProfitabilityReport(params: DateRangeParams): Promise<DestinationProfitabilityItem[]> {
    const queryParams = new URLSearchParams();
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    const url = `/api/reports/financial/destination?${queryParams.toString()}`;
    const response = await fetchWithAuth<{report: DestinationProfitabilityItem[]}>(url);
    return response.report;
  }

  // Dohvat izvještaja profitabilnosti po aviokompaniji
  async getAirlineProfitabilityReport(params: DateRangeParams): Promise<AirlineProfitabilityItem[]> {
    const queryParams = new URLSearchParams();
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    const url = `/api/reports/financial/airline?${queryParams.toString()}`;
    const response = await fetchWithAuth<{report: AirlineProfitabilityItem[]}>(url);
    return response.report;
  }

  // Dohvat ukupnog finansijskog izvještaja
  async getSummaryFinancialReport(params: DateRangeParams): Promise<SummaryFinancialReport> {
    const queryParams = new URLSearchParams();
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    const url = `/api/reports/financial/summary?${queryParams.toString()}`;
    const response = await fetchWithAuth<{report: SummaryFinancialReport}>(url);
    return response.report;
  }
}

export default new FinancialReportsService();
