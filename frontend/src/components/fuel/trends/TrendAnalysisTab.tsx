/**
 * TrendAnalysisTab.tsx
 * Glavna komponenta za trend analizu potrošnje goriva
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import TrendChart from './TrendChart';
import SeasonalHeatmap from './SeasonalHeatmap';
import FuelReportsTrendsApi from '../../../services/fuelReportsTrendsApi';

import type {
  TrendAnalysisState,
  TrendAnalysisFilters,
  WeeklyTrendData,
  MonthlyTrendData,
  YearOverYearData,
  SeasonalPattern,
  ChartSeries,
  DateRangeFilter,
  TrendDataPoint,
} from '../../../types/fuelReportsTrends.types';

const TrendAnalysisTab: React.FC = () => {
  // State management
  const [state, setState] = useState<TrendAnalysisState>({
    isLoading: false,
    error: null,
    filters: {
      dateRange: {
        startDate: FuelReportsTrendsApi.dates.formatDateForAPI(
          FuelReportsTrendsApi.dates.getDateMonthsAgo(12)
        ),
        endDate: FuelReportsTrendsApi.dates.formatDateForAPI(new Date()),
      },
      trendType: 'monthly',
      metrics: ['quantity', 'revenue'],
      destinations: [],
      airlines: [],
    },
    weeklyData: null,
    monthlyData: null,
    yearOverYearData: null,
    seasonalPatterns: null,
  });

  // Date picker states
  const [startDate, setStartDate] = useState<Date | undefined>(
    FuelReportsTrendsApi.dates.getDateMonthsAgo(12)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // Load data based on current filters
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { dateRange, trendType } = state.filters;

      // Load based on trend type
      switch (trendType) {
        case 'weekly':
          const weeklyData = await FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.trends.getWeeklyTrendData(dateRange)
          );
          setState(prev => ({ ...prev, weeklyData, isLoading: false }));
          break;

        case 'monthly':
          const monthlyData = await FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.trends.getMonthlyTrendData(dateRange)
          );
          setState(prev => ({ ...prev, monthlyData, isLoading: false }));
          break;

        case 'yearly':
          const currentYear = new Date().getFullYear();
          const yearOverYearData = await FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.trends.getYearOverYearData(currentYear)
          );
          setState(prev => ({ ...prev, yearOverYearData, isLoading: false }));
          break;
      }

      // Always load seasonal patterns
      const seasonalPatterns = await FuelReportsTrendsApi.withErrorHandling(() =>
        FuelReportsTrendsApi.trends.getSeasonalPatterns(dateRange)
      );
      setState(prev => ({ ...prev, seasonalPatterns }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Greška prilikom učitavanja podataka',
      }));
    }
  }, [state.filters]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle date range change
  const handleDateRangeChange = () => {
    if (startDate && endDate) {
      const newDateRange: DateRangeFilter = {
        startDate: FuelReportsTrendsApi.dates.formatDateForAPI(startDate),
        endDate: FuelReportsTrendsApi.dates.formatDateForAPI(endDate),
      };
      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, dateRange: newDateRange },
      }));
    }
  };

  // Handle trend type change
  const handleTrendTypeChange = (trendType: 'weekly' | 'monthly' | 'yearly') => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, trendType },
      // Clear previous data
      weeklyData: null,
      monthlyData: null,
      yearOverYearData: null,
    }));
  };

  // Handle metrics change
  const handleMetricsChange = (metric: 'quantity' | 'revenue' | 'operations') => {
    setState(prev => {
      const currentMetrics = prev.filters.metrics;
      const newMetrics = currentMetrics.includes(metric)
        ? currentMetrics.filter(m => m !== metric)
        : [...currentMetrics, metric];
      
      return {
        ...prev,
        filters: { ...prev.filters, metrics: newMetrics },
      };
    });
  };

  // Convert trend data to chart format
  const convertToChartData = (
    data: WeeklyTrendData | MonthlyTrendData | null,
    type: 'weekly' | 'monthly'
  ): ChartSeries[] => {
    if (!data) return [];

    const trendData = type === 'weekly' 
      ? (data as WeeklyTrendData).weeklyData 
      : (data as MonthlyTrendData).monthlyData;
    const series: ChartSeries[] = [];

    if (state.filters.metrics.includes('quantity')) {
      series.push({
        name: 'Količina (L)',
        data: trendData.map((point: TrendDataPoint) => ({
          x: point.period,
          y: point.quantity_liters,
        })),
        color: '#2563eb',
        type: 'line',
      });
    }

    if (state.filters.metrics.includes('revenue')) {
      series.push({
        name: 'Prihod (BAM)',
        data: trendData.map((point: TrendDataPoint) => ({
          x: point.period,
          y: point.revenue,
        })),
        color: '#16a34a',
        type: 'line',
      });
    }

    if (state.filters.metrics.includes('operations')) {
      series.push({
        name: 'Broj operacija',
        data: trendData.map((point: TrendDataPoint) => ({
          x: point.period,
          y: point.operations_count,
        })),
        color: '#ea580c',
        type: 'bar',
      });
    }

    return series;
  };

  // Convert year-over-year data to chart format
  const convertYearOverYearToChartData = (data: YearOverYearData | null): ChartSeries[] => {
    if (!data) return [];

    const series: ChartSeries[] = [];

    if (state.filters.metrics.includes('quantity')) {
      series.push(
        {
          name: 'Trenutna godina (L)',
          data: data.currentYear.map(point => ({
            x: point.period,
            y: point.quantity_liters,
          })),
          color: '#2563eb',
          type: 'line',
        },
        {
          name: 'Prethodna godina (L)',
          data: data.previousYear.map(point => ({
            x: point.period,
            y: point.quantity_liters,
          })),
          color: '#64748b',
          type: 'line',
        }
      );
    }

    if (state.filters.metrics.includes('revenue')) {
      series.push(
        {
          name: 'Trenutna godina (BAM)',
          data: data.currentYear.map(point => ({
            x: point.period,
            y: point.revenue,
          })),
          color: '#16a34a',
          type: 'line',
        },
        {
          name: 'Prethodna godina (BAM)',
          data: data.previousYear.map(point => ({
            x: point.period,
            y: point.revenue,
          })),
          color: '#6b7280',
          type: 'line',
        }
      );
    }

    return series;
  };

  // Render main content
  const renderMainChart = () => {
    const { trendType } = state.filters;

    switch (trendType) {
      case 'weekly':
        return (
          <TrendChart
            title="Sedmični trend potrošnje"
            data={convertToChartData(state.weeklyData, 'weekly')}
            height={400}
            xAxisLabel="Sedmica"
            yAxisLabel="Vrijednost"
          />
        );

      case 'monthly':
        return (
          <TrendChart
            title="Mjesečni trend potrošnje"
            data={convertToChartData(state.monthlyData, 'monthly')}
            height={400}
            xAxisLabel="Mjesec"
            yAxisLabel="Vrijednost"
          />
        );

      case 'yearly':
        return (
          <TrendChart
            title="Godišnja poredba potrošnje"
            data={convertYearOverYearToChartData(state.yearOverYearData)}
            height={400}
            xAxisLabel="Mjesec"
            yAxisLabel="Vrijednost"
          />
        );

      default:
        return null;
    }
  };

  // Render summary statistics
  const renderSummaryStats = () => {
    const { trendType } = state.filters;

    if (trendType === 'yearly' && state.yearOverYearData?.comparison) {
      const comparisonData = state.yearOverYearData.comparison;
      
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sažetak - Godišnja poredba</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {comparisonData.totalGrowthRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Ukupan rast</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {comparisonData.monthlyComparisons.length}
                </div>
                <div className="text-sm text-gray-600">Mjeseci u poredbi</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(...comparisonData.monthlyComparisons.map(m => m.growthRate)).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Najveći rast</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.min(...comparisonData.monthlyComparisons.map(m => m.growthRate)).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Najmanji rast</div>
              </div>
            </div>
            
            {/* Monthly comparisons details */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Mjesečne poredbe</h5>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {comparisonData.monthlyComparisons.map((month) => (
                  <div key={month.month} className="text-center">
                    <div className="font-medium">{month.month}</div>
                    <div className={`${month.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {month.growthRate.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Handle weekly/monthly summaries
    let summaryData = null;
    let summaryTitle = '';

    if (trendType === 'weekly' && state.weeklyData?.summary) {
      summaryData = state.weeklyData.summary;
      summaryTitle = 'Sažetak - Sedmični trend';
    } else if (trendType === 'monthly' && state.monthlyData?.summary) {
      summaryData = state.monthlyData.summary;
      summaryTitle = 'Sažetak - Mjesečni trend';
    }

    if (!summaryData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summaryData.totalOperations.toLocaleString('bs-BA')}
              </div>
              <div className="text-sm text-gray-600">Ukupno operacija</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summaryData.totalQuantityLiters.toLocaleString('bs-BA', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
              <div className="text-sm text-gray-600">Ukupna količina (L)</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {summaryData.totalRevenue.toLocaleString('bs-BA', {
                  style: 'currency',
                  currency: 'BAM',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
              <div className="text-sm text-gray-600">Ukupan prihod</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {trendType === 'weekly' 
                  ? `${(summaryData as any).averageWeeklyGrowth?.toFixed(1)}%`
                  : `${(summaryData as any).averageMonthlyGrowth?.toFixed(1)}%`
                }
              </div>
              <div className="text-sm text-gray-600">Prosječan rast</div>
            </div>
          </div>
          
          {/* Additional trend info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Trend informacije</h5>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-600">Najjači rast:</div>
                <div className="font-medium">
                  {trendType === 'weekly' 
                    ? (summaryData as any).strongestGrowthWeek
                    : (summaryData as any).strongestGrowthMonth
                  }
                </div>
              </div>
              <div>
                <div className="text-gray-600">Najslabiji rast:</div>
                <div className="font-medium">
                  {trendType === 'weekly' 
                    ? (summaryData as any).weakestGrowthWeek
                    : (summaryData as any).weakestGrowthMonth
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend Analiza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Datum od:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd.MM.yyyy") : "Odaberite datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Datum do:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd.MM.yyyy") : "Odaberite datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Trend Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tip trenda:</label>
              <Select
                value={state.filters.trendType}
                onValueChange={(value: 'weekly' | 'monthly' | 'yearly') => 
                  handleTrendTypeChange(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Sedmično</SelectItem>
                  <SelectItem value="monthly">Mjesečno</SelectItem>
                  <SelectItem value="yearly">Godina na godinu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply Filters Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button 
                onClick={handleDateRangeChange}
                className="w-full"
                disabled={state.isLoading}
              >
                {state.isLoading ? 'Učitava...' : 'Primijeni filtere'}
              </Button>
            </div>
          </div>

          {/* Metrics Selection */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Metrieke za prikaz:</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'quantity', label: 'Količina', icon: Activity },
                { key: 'revenue', label: 'Prihod', icon: TrendingUp },
                { key: 'operations', label: 'Operacije', icon: BarChart3 },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={state.filters.metrics.includes(key as any) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleMetricsChange(key as any)}
                  className="flex items-center gap-1"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-800">
              <strong>Greška:</strong> {state.error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Chart */}
      {renderMainChart()}

      {/* Summary Statistics */}
      {renderSummaryStats()}

      {/* Seasonal Patterns */}
      {state.seasonalPatterns && (
        <SeasonalHeatmap
          data={state.seasonalPatterns}
          title="Sezonski uzorci potrošnje"
          height={400}
        />
      )}
    </div>
  );
};

export default TrendAnalysisTab; 