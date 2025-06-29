/**
 * fuelReportsTrendsApi.ts
 * API service za fuel reports trends
 */

import { fetchWithAuth } from '../lib/apiService';
import type {
  APIResponse,
  DateRangeFilter,
  WeeklyTrendData,
  MonthlyTrendData,
  YearOverYearData,
  SeasonalPattern,
  PeriodComparisonData,
  DestinationTrendingData,
  MarketShareAnalysis,
  LinearTrendForecast,
  MovingAverageForecast,
  ExponentialSmoothingForecast,
  DestinationForecast,
} from '../types/fuelReportsTrends.types';

// Base URL za fuel reports API
const FUEL_REPORTS_BASE_URL = '/fuel/reports';

/**
 * Trend Analysis API calls
 */
export class TrendAnalysisApi {
  /**
   * Dohvata sedmične trend podatke
   */
  static async getWeeklyTrendData(filter: DateRangeFilter): Promise<WeeklyTrendData> {
    const queryParams = new URLSearchParams({
      startDate: filter.startDate,
      endDate: filter.endDate,
    });
    
    const response = await fetchWithAuth<APIResponse<WeeklyTrendData>>(
      `/api${FUEL_REPORTS_BASE_URL}/weekly?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata mjesečne trend podatke
   */
  static async getMonthlyTrendData(filter: DateRangeFilter): Promise<MonthlyTrendData> {
    const queryParams = new URLSearchParams({
      startDate: filter.startDate,
      endDate: filter.endDate,
    });
    
    const response = await fetchWithAuth<APIResponse<MonthlyTrendData>>(
      `/api${FUEL_REPORTS_BASE_URL}/monthly?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata year-over-year poredbu
   */
  static async getYearOverYearData(year: number): Promise<YearOverYearData> {
    const queryParams = new URLSearchParams({
      year: year.toString(),
    });
    
    const response = await fetchWithAuth<APIResponse<YearOverYearData>>(
      `/api${FUEL_REPORTS_BASE_URL}/year-over-year?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata sezonske uzorke
   */
  static async getSeasonalPatterns(filter: DateRangeFilter): Promise<SeasonalPattern[]> {
    const queryParams = new URLSearchParams({
      startDate: filter.startDate,
      endDate: filter.endDate,
    });
    
    const response = await fetchWithAuth<APIResponse<SeasonalPattern[]>>(
      `/api${FUEL_REPORTS_BASE_URL}/seasonal-patterns?${queryParams.toString()}`
    );
    return response.data;
  }
}

/**
 * Comparative Analysis API calls
 */
export class ComparativeAnalysisApi {
  /**
   * Dohvata mjesečnu komparativnu analizu
   */
  static async getMonthlyComparison(currentMonth: string): Promise<PeriodComparisonData> {
    const queryParams = new URLSearchParams({
      currentMonth,
    });
    
    const response = await fetchWithAuth<APIResponse<PeriodComparisonData>>(
      `/api${FUEL_REPORTS_BASE_URL}/comparison/monthly?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata godišnju komparativnu analizu
   */
  static async getYearlyComparison(currentYear: number): Promise<PeriodComparisonData> {
    const queryParams = new URLSearchParams({
      currentYear: currentYear.toString(),
    });
    
    const response = await fetchWithAuth<APIResponse<PeriodComparisonData>>(
      `/api${FUEL_REPORTS_BASE_URL}/comparison/yearly?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata analizu trending destinacija
   */
  static async getDestinationTrendingData(
    currentPeriod: DateRangeFilter,
    previousPeriod: DateRangeFilter
  ): Promise<DestinationTrendingData[]> {
    const queryParams = new URLSearchParams({
      currentStartDate: currentPeriod.startDate,
      currentEndDate: currentPeriod.endDate,
      previousStartDate: previousPeriod.startDate,
      previousEndDate: previousPeriod.endDate,
    });
    
    const response = await fetchWithAuth<APIResponse<DestinationTrendingData[]>>(
      `/api${FUEL_REPORTS_BASE_URL}/destination-trends?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata market share analizu
   */
  static async getMarketShareAnalysis(
    currentPeriod: DateRangeFilter,
    previousPeriod: DateRangeFilter
  ): Promise<MarketShareAnalysis> {
    const queryParams = new URLSearchParams({
      currentStartDate: currentPeriod.startDate,
      currentEndDate: currentPeriod.endDate,
      previousStartDate: previousPeriod.startDate,
      previousEndDate: previousPeriod.endDate,
    });
    
    const response = await fetchWithAuth<APIResponse<MarketShareAnalysis>>(
      `/api${FUEL_REPORTS_BASE_URL}/market-share?${queryParams.toString()}`
    );
    return response.data;
  }
}

/**
 * Forecasting API calls
 */
export class ForecastingApi {
  /**
   * Dohvata linearnu trend prognozu
   */
  static async getLinearTrendForecast(
    filter: DateRangeFilter,
    forecastMonths: number = 6
  ): Promise<LinearTrendForecast> {
    const queryParams = new URLSearchParams({
      startDate: filter.startDate,
      endDate: filter.endDate,
      forecastMonths: forecastMonths.toString(),
    });
    
    const response = await fetchWithAuth<APIResponse<LinearTrendForecast>>(
      `/api${FUEL_REPORTS_BASE_URL}/forecast/linear?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata moving average prognozu
   */
  static async getMovingAverageForecast(
    filter: DateRangeFilter,
    forecastMonths: number = 6,
    windowSize: number = 3
  ): Promise<MovingAverageForecast> {
    const queryParams = new URLSearchParams({
      startDate: filter.startDate,
      endDate: filter.endDate,
      forecastMonths: forecastMonths.toString(),
      windowSize: windowSize.toString(),
    });
    
    const response = await fetchWithAuth<APIResponse<MovingAverageForecast>>(
      `/api${FUEL_REPORTS_BASE_URL}/forecast/moving-average?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata exponential smoothing prognozu
   */
  static async getExponentialSmoothingForecast(
    filter: DateRangeFilter,
    forecastMonths: number = 6,
    alpha: number = 0.3
  ): Promise<ExponentialSmoothingForecast> {
    const queryParams = new URLSearchParams({
      startDate: filter.startDate,
      endDate: filter.endDate,
      forecastMonths: forecastMonths.toString(),
      alpha: alpha.toString(),
    });
    
    const response = await fetchWithAuth<APIResponse<ExponentialSmoothingForecast>>(
      `/api${FUEL_REPORTS_BASE_URL}/forecast/exponential?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Dohvata prognozu po destinacijama
   */
  static async getDestinationForecasts(
    filter: DateRangeFilter,
    forecastMonths: number = 6
  ): Promise<DestinationForecast[]> {
    const queryParams = new URLSearchParams({
      startDate: filter.startDate,
      endDate: filter.endDate,
      forecastMonths: forecastMonths.toString(),
    });
    
    const response = await fetchWithAuth<APIResponse<DestinationForecast[]>>(
      `/api${FUEL_REPORTS_BASE_URL}/forecast/destinations?${queryParams.toString()}`
    );
    return response.data;
  }
}

/**
 * Utility funkcije za rad s datumima
 */
export class DateUtils {
  /**
   * Konvertuje Date objekt u YYYY-MM-DD string format
   */
  static formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Kreira DateRangeFilter objekt iz dva Date objekta
   */
  static createDateRangeFilter(startDate: Date, endDate: Date): DateRangeFilter {
    return {
      startDate: this.formatDateForAPI(startDate),
      endDate: this.formatDateForAPI(endDate),
    };
  }

  /**
   * Vraća datum prije N mjeseci
   */
  static getDateMonthsAgo(months: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }

  /**
   * Vraća prvi dan trenutnog mjeseca
   */
  static getStartOfCurrentMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Vraća posljednji dan trenutnog mjeseca
   */
  static getEndOfCurrentMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * Vraća prvi dan prethodnog mjeseca
   */
  static getStartOfPreviousMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() - 1, 1);
  }

  /**
   * Vraća posljednji dan prethodnog mjeseca
   */
  static getEndOfPreviousMonth(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 0);
  }

  /**
   * Vraća YYYY-MM format za trenutni mjesec
   */
  static getCurrentMonthString(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Vraća godinu kao broj
   */
  static getCurrentYear(): number {
    return new Date().getFullYear();
  }

  /**
   * Kreira period za mjesečnu komparaciju
   */
  static createMonthlyComparisonPeriods(): {
    current: DateRangeFilter;
    previous: DateRangeFilter;
  } {
    return {
      current: this.createDateRangeFilter(
        this.getStartOfCurrentMonth(),
        this.getEndOfCurrentMonth()
      ),
      previous: this.createDateRangeFilter(
        this.getStartOfPreviousMonth(),
        this.getEndOfPreviousMonth()
      ),
    };
  }

  /**
   * Kreira period za godišnju komparaciju
   */
  static createYearlyComparisonPeriods(): {
    current: DateRangeFilter;
    previous: DateRangeFilter;
  } {
    const currentYear = this.getCurrentYear();
    const previousYear = currentYear - 1;

    return {
      current: {
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
      },
      previous: {
        startDate: `${previousYear}-01-01`,
        endDate: `${previousYear}-12-31`,
      },
    };
  }
}

/**
 * Error handling wrapper
 */
export class FuelReportsTrendsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'FuelReportsTrendsApiError';
  }
}

/**
 * Unified API class sa error handling
 */
export class FuelReportsTrendsApi {
  /**
   * Trend analysis methods
   */
  static trends = TrendAnalysisApi;

  /**
   * Comparative analysis methods
   */
  static comparative = ComparativeAnalysisApi;

  /**
   * Forecasting methods
   */
  static forecasting = ForecastingApi;

  /**
   * Date utilities
   */
  static dates = DateUtils;

  /**
   * Wrapper s error handling
   */
  static async withErrorHandling<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      console.error('FuelReportsTrendsApi Error:', error);
      
      // fetchWithAuth already handles authentication errors and redirects,
      // so we just need to handle other types of errors
      if (error.message) {
        throw new FuelReportsTrendsApiError(error.message, error.statusCode, error);
      } else {
        throw new FuelReportsTrendsApiError('Nepoznata greška', 0, error);
      }
    }
  }
}

// Default export
export default FuelReportsTrendsApi; 