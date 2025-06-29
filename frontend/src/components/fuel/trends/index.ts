/**
 * index.ts
 * Export file za sve fuel trends komponente
 */

// Main tab components
export { default as TrendAnalysisTab } from './TrendAnalysisTab';
export { default as ComparativeAnalysisTab } from './ComparativeAnalysisTab';
export { default as ForecastingTab } from './ForecastingTab';

// Chart components
export { default as TrendChart } from './TrendChart';
export { default as SeasonalHeatmap } from './SeasonalHeatmap';

// Filter and utility components
export { default as AdvancedFilters } from './AdvancedFiltersSimple';
export { default as ExportButton } from './ExportButton';

// Export types
export type { AdvancedFilterState } from './AdvancedFiltersSimple';
export type { ExportFormat, ExportData } from './ExportButton';

// Re-export types for convenience
export type {
  TrendAnalysisState,
  ComparativeAnalysisState,
  TrendChartProps,
  SeasonalHeatmapProps,
  ChartSeries,
  ChartDataPoint,
  WeeklyTrendData,
  MonthlyTrendData,
  YearOverYearData,
  SeasonalPattern,
  PeriodComparisonData,
  DestinationTrendingData,
  MarketShareAnalysis,
  TrendAnalysisFilters,
  ComparativeAnalysisFilters,
} from '../../../types/fuelReportsTrends.types'; 