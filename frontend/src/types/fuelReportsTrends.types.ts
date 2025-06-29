/**
 * fuelReportsTrends.types.ts
 * Type definicije za fuel reports trends API
 */

// Osnovni tip za datum range filter
export interface DateRangeFilter {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
}

// Trend data point
export interface TrendDataPoint {
  period: string;
  date: string;
  quantity_liters: number;
  quantity_kg: number;
  revenue: number;
  operations_count: number;
  growth_rate?: number;
  moving_average?: number;
}

// Weekly trend data
export interface WeeklyTrendData {
  weeklyData: TrendDataPoint[];
  summary: {
    totalGrowthRate: number;
    averageWeeklyGrowth: number;
    strongestGrowthWeek: string;
    weakestGrowthWeek: string;
    totalOperations: number;
    totalQuantityLiters: number;
    totalRevenue: number;
  };
}

// Monthly trend data
export interface MonthlyTrendData {
  monthlyData: TrendDataPoint[];
  summary: {
    totalGrowthRate: number;
    averageMonthlyGrowth: number;
    strongestGrowthMonth: string;
    weakestGrowthMonth: string;
    totalOperations: number;
    totalQuantityLiters: number;
    totalRevenue: number;
  };
}

// Year-over-year comparison
export interface YearOverYearData {
  currentYear: TrendDataPoint[];
  previousYear: TrendDataPoint[];
  comparison: {
    totalGrowthRate: number;
    monthlyComparisons: {
      month: string;
      currentYear: number;
      previousYear: number;
      growthRate: number;
    }[];
  };
}

// Seasonal patterns
export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  averageConsumption: number;
  seasonalIndex: number;
  months: {
    month: string;
    consumption: number;
    index: number;
  }[];
}

// Period comparison (mjesečno/godišnje)
export interface PeriodComparisonData {
  current: {
    period: string;
    startDate: string;
    endDate: string;
    totalQuantityLiters: number;
    totalQuantityKg: number;
    totalRevenue: number;
    operationsCount: number;
    avgOperationSize: number;
    uniqueDestinations: number;
    uniqueAirlines: number;
  };
  previous: {
    period: string;
    startDate: string;
    endDate: string;
    totalQuantityLiters: number;
    totalQuantityKg: number;
    totalRevenue: number;
    operationsCount: number;
    avgOperationSize: number;
    uniqueDestinations: number;
    uniqueAirlines: number;
  };
  comparison: {
    quantityGrowth: number;
    revenueGrowth: number;
    operationsGrowth: number;
    avgSizeGrowth: number;
    destinationsGrowth: number;
    airlinesGrowth: number;
  };
}

// Destination trending
export interface DestinationTrendingData {
  destination: string;
  current: {
    quantity: number;
    revenue: number;
    operations: number;
    marketShare: number;
  };
  previous: {
    quantity: number;
    revenue: number;
    operations: number;
    marketShare: number;
  };
  growth: {
    quantityGrowth: number;
    revenueGrowth: number;
    operationsGrowth: number;
    marketShareChange: number;
  };
  status: 'growing' | 'declining' | 'stable';
}

// Airline trending
export interface AirlineTrendingData {
  airlineId: number;
  airlineName: string;
  current: {
    quantity: number;
    revenue: number;
    operations: number;
    marketShare: number;
  };
  previous: {
    quantity: number;
    revenue: number;
    operations: number;
    marketShare: number;
  };
  growth: {
    quantityGrowth: number;
    revenueGrowth: number;
    operationsGrowth: number;
    marketShareChange: number;
  };
  status: 'growing' | 'declining' | 'stable';
}

// Market share analysis
export interface MarketShareAnalysis {
  totalMarket: {
    currentQuantity: number;
    previousQuantity: number;
    growthRate: number;
  };
  destinationAnalysis: DestinationTrendingData[];
  airlineAnalysis: AirlineTrendingData[];
  summary: {
    growingDestinations: number;
    decliningDestinations: number;
    stableDestinations: number;
    growingAirlines: number;
    decliningAirlines: number;
    stableAirlines: number;
    marketConcentration: number;
  };
}

// Forecast data point
export interface ForecastDataPoint {
  period: string;
  date: string;
  predicted: number;
  confidence_lower: number;
  confidence_upper: number;
  trend_component: number;
  seasonal_component: number;
}

// Historical data point
export interface HistoricalDataPoint {
  period: string;
  date: string;
  value: number;
  trend?: number;
  seasonal?: number;
}

// Linear trend forecast
export interface LinearTrendForecast {
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  trendLine: {
    slope: number;
    intercept: number;
    r_squared: number;
  };
  seasonalFactors: Record<number, number>;
  accuracy: {
    mae: number;
    mape: number;
    rmse: number;
  };
}

// Moving average forecast
export interface MovingAverageForecast {
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  movingAverageWindow: number;
  accuracy: {
    mae: number;
    mape: number;
    rmse: number;
  };
}

// Exponential smoothing forecast
export interface ExponentialSmoothingForecast {
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  alpha: number;
  beta?: number;
  gamma?: number;
  accuracy: {
    mae: number;
    mape: number;
    rmse: number;
  };
}

// Destination forecast
export interface DestinationForecast {
  destination: string;
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  growthTrend: 'increasing' | 'decreasing' | 'stable';
  confidence: 'high' | 'medium' | 'low';
}

// API Response wrappers
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Chart data types za komponente
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

// Props za komponente
export interface TrendChartProps {
  title: string;
  data: ChartSeries[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  onDataPointClick?: (point: ChartDataPoint, series: ChartSeries) => void;
}

export interface SeasonalHeatmapProps {
  data: SeasonalPattern[];
  title?: string;
  height?: number;
  onCellClick?: (season: string, month: string, value: number) => void;
}

// Filter options za UI
export interface TrendAnalysisFilters {
  dateRange: DateRangeFilter;
  trendType: 'weekly' | 'monthly' | 'yearly';
  metrics: ('quantity' | 'revenue' | 'operations')[];
  destinations?: string[];
  airlines?: string[];
}

export interface ComparativeAnalysisFilters {
  comparisonType: 'monthly' | 'yearly' | 'custom';
  currentPeriod: DateRangeFilter;
  previousPeriod?: DateRangeFilter;
  groupBy: 'destination' | 'airline' | 'total';
}

export interface ForecastingFilters {
  historicalPeriod: DateRangeFilter;
  forecastMonths: number;
  method: 'linear' | 'moving-average' | 'exponential' | 'destinations';
  parameters?: {
    windowSize?: number; // za moving average
    alpha?: number;      // za exponential smoothing
    beta?: number;       // za exponential smoothing
    gamma?: number;      // za exponential smoothing
  };
}

// State types za komponente
export interface TrendAnalysisState {
  isLoading: boolean;
  error: string | null;
  filters: TrendAnalysisFilters;
  weeklyData: WeeklyTrendData | null;
  monthlyData: MonthlyTrendData | null;
  yearOverYearData: YearOverYearData | null;
  seasonalPatterns: SeasonalPattern[] | null;
}

export interface ComparativeAnalysisState {
  isLoading: boolean;
  error: string | null;
  filters: ComparativeAnalysisFilters;
  comparisonData: PeriodComparisonData | null;
  destinationTrending: DestinationTrendingData[] | null;
  marketShareAnalysis: MarketShareAnalysis | null;
}

export interface ForecastingState {
  isLoading: boolean;
  error: string | null;
  filters: ForecastingFilters;
  linearForecast: LinearTrendForecast | null;
  movingAverageForecast: MovingAverageForecast | null;
  exponentialForecast: ExponentialSmoothingForecast | null;
  destinationForecasts: DestinationForecast[] | null;
} 