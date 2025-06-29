/**
 * ComparativeAnalysisTab.tsx
 * Komponenta za komparativnu analizu potrošnje goriva između perioda
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3, Building, Plane } from 'lucide-react';

import TrendChart from './TrendChart';
import FuelReportsTrendsApi from '../../../services/fuelReportsTrendsApi';

import type {
  ComparativeAnalysisState,
  ComparativeAnalysisFilters,
  PeriodComparisonData,
  DestinationTrendingData,
  MarketShareAnalysis,
  ChartSeries,
} from '../../../types/fuelReportsTrends.types';

const ComparativeAnalysisTab: React.FC = () => {
  // State management
  const [state, setState] = useState<ComparativeAnalysisState>({
    isLoading: false,
    error: null,
    filters: {
      comparisonType: 'monthly',
      currentPeriod: FuelReportsTrendsApi.dates.createMonthlyComparisonPeriods().current,
      previousPeriod: FuelReportsTrendsApi.dates.createMonthlyComparisonPeriods().previous,
      groupBy: 'total',
    },
    comparisonData: null,
    destinationTrending: null,
    marketShareAnalysis: null,
  });

  // Load data based on current filters
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { comparisonType, currentPeriod, previousPeriod } = state.filters;

      // Load period comparison
      let comparisonData: PeriodComparisonData;
      
      if (comparisonType === 'monthly') {
        const currentMonth = FuelReportsTrendsApi.dates.getCurrentMonthString();
        comparisonData = await FuelReportsTrendsApi.withErrorHandling(() =>
          FuelReportsTrendsApi.comparative.getMonthlyComparison(currentMonth)
        );
      } else if (comparisonType === 'yearly') {
        const currentYear = FuelReportsTrendsApi.dates.getCurrentYear();
        comparisonData = await FuelReportsTrendsApi.withErrorHandling(() =>
          FuelReportsTrendsApi.comparative.getYearlyComparison(currentYear)
        );
      } else {
        // Custom comparison with manual periods
        if (!previousPeriod) {
          throw new Error('Previous period is required for custom comparison');
        }
        
        // For custom comparison, we'll use destination trending with manual periods
        const destinationTrending = await FuelReportsTrendsApi.withErrorHandling(() =>
          FuelReportsTrendsApi.comparative.getDestinationTrendingData(currentPeriod, previousPeriod)
        );
        
        setState(prev => ({ ...prev, destinationTrending, isLoading: false }));
        return;
      }

      setState(prev => ({ ...prev, comparisonData, isLoading: false }));

      // Load additional data
      if (currentPeriod && previousPeriod) {
        const [destinationTrending, marketShareAnalysis] = await Promise.all([
          FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.comparative.getDestinationTrendingData(currentPeriod, previousPeriod)
          ),
          FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.comparative.getMarketShareAnalysis(currentPeriod, previousPeriod)
          ),
        ]);

        setState(prev => ({ ...prev, destinationTrending, marketShareAnalysis }));
      }

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

  // Handle comparison type change
  const handleComparisonTypeChange = (comparisonType: 'monthly' | 'yearly' | 'custom') => {
    let newPeriods;
    
    if (comparisonType === 'monthly') {
      newPeriods = FuelReportsTrendsApi.dates.createMonthlyComparisonPeriods();
    } else if (comparisonType === 'yearly') {
      newPeriods = FuelReportsTrendsApi.dates.createYearlyComparisonPeriods();
    } else {
      // Keep current periods for custom
      newPeriods = {
        current: state.filters.currentPeriod,
        previous: state.filters.previousPeriod,
      };
    }

    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        comparisonType,
        currentPeriod: newPeriods.current,
        previousPeriod: newPeriods.previous,
      },
      // Clear previous data
      comparisonData: null,
      destinationTrending: null,
      marketShareAnalysis: null,
    }));
  };

  // Handle group by change
  const handleGroupByChange = (groupBy: 'destination' | 'airline' | 'total') => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, groupBy },
    }));
  };

  // Format number with proper localization
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
    return value.toLocaleString('bs-BA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options,
    });
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get trend icon and color
  const getTrendIndicator = (growthRate: number) => {
    if (growthRate > 5) {
      return { icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (growthRate < -5) {
      return { icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-100' };
    } else {
      return { icon: Minus, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  // Render period comparison chart
  const renderComparisonChart = (): ChartSeries[] => {
    if (!state.comparisonData) return [];

    const { current, previous } = state.comparisonData;
    
    return [
      {
        name: `Trenutni period (${current.period})`,
        data: [
          { x: 'Količina (L)', y: current.totalQuantityLiters },
          { x: 'Prihod (BAM)', y: current.totalRevenue },
          { x: 'Operacije', y: current.operationsCount },
          { x: 'Destinacije', y: current.uniqueDestinations },
          { x: 'Aviokompanije', y: current.uniqueAirlines },
        ],
        color: '#2563eb',
        type: 'bar',
      },
      {
        name: `Prethodni period (${previous.period})`,
        data: [
          { x: 'Količina (L)', y: previous.totalQuantityLiters },
          { x: 'Prihod (BAM)', y: previous.totalRevenue },
          { x: 'Operacije', y: previous.operationsCount },
          { x: 'Destinacije', y: previous.uniqueDestinations },
          { x: 'Aviokompanije', y: previous.uniqueAirlines },
        ],
        color: '#64748b',
        type: 'bar',
      },
    ];
  };

  // Render destination trending table
  const renderDestinationTrending = () => {
    if (!state.destinationTrending || state.destinationTrending.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Trending destinacije</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Nema podataka o trending destinacijama
            </div>
          </CardContent>
        </Card>
      );
    }

    // Sort by growth rate
    const sortedDestinations = [...state.destinationTrending].sort(
      (a, b) => b.growth.quantityGrowth - a.growth.quantityGrowth
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Trending destinacije
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedDestinations.slice(0, 10).map((destination, index) => {
              const trendIndicator = getTrendIndicator(destination.growth.quantityGrowth);
              const TrendIcon = trendIndicator.icon;

              return (
                <div key={destination.destination} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${trendIndicator.bgColor}`}>
                      <TrendIcon className={`h-4 w-4 ${trendIndicator.color}`} />
                    </div>
                    <div>
                      <div className="font-medium">{destination.destination}</div>
                      <div className="text-sm text-gray-600">
                        Trenutno: {formatNumber(destination.current.quantity)} L
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge 
                      variant={destination.status === 'growing' ? 'default' : 
                              destination.status === 'declining' ? 'destructive' : 'secondary'}
                    >
                      {formatPercentage(destination.growth.quantityGrowth)}
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">
                      {destination.status === 'growing' ? 'Raste' : 
                       destination.status === 'declining' ? 'Opada' : 'Stabilno'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render market share summary
  const renderMarketShareSummary = () => {
    if (!state.marketShareAnalysis) return null;

    const { summary } = state.marketShareAnalysis;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sažetak tržišta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.growingDestinations}
              </div>
              <div className="text-sm text-gray-600">Destinacije u rastu</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.decliningDestinations}
              </div>
              <div className="text-sm text-gray-600">Destinacije u padu</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {summary.stableDestinations}
              </div>
              <div className="text-sm text-gray-600">Stabilne destinacije</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary.growingAirlines}
              </div>
              <div className="text-sm text-gray-600">Kompanije u rastu</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.decliningAirlines}
              </div>
              <div className="text-sm text-gray-600">Kompanije u padu</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {summary.marketConcentration.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Koncentracija tržišta</div>
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
            <BarChart3 className="h-5 w-5" />
            Komparativna Analiza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Comparison Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tip poredbe:</label>
              <Select
                value={state.filters.comparisonType}
                onValueChange={(value: 'monthly' | 'yearly' | 'custom') =>
                  handleComparisonTypeChange(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mjesec na mjesec</SelectItem>
                  <SelectItem value="yearly">Godina na godinu</SelectItem>
                  <SelectItem value="custom">Prilagođeno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Grupiranje:</label>
              <Select
                value={state.filters.groupBy}
                onValueChange={(value: 'destination' | 'airline' | 'total') =>
                  handleGroupByChange(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Ukupno</SelectItem>
                  <SelectItem value="destination">Po destinaciji</SelectItem>
                  <SelectItem value="airline">Po aviokompaniji</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button
                onClick={loadData}
                className="w-full"
                disabled={state.isLoading}
              >
                {state.isLoading ? 'Učitava...' : 'Osvježi podatke'}
              </Button>
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

      {/* Period Comparison Chart */}
      {state.comparisonData && (
        <TrendChart
          title="Poredba perioda"
          data={renderComparisonChart()}
          height={400}
          xAxisLabel="Metrijska"
          yAxisLabel="Vrijednost"
        />
      )}

      {/* Key Performance Indicators */}
      {state.comparisonData && (
        <Card>
          <CardHeader>
            <CardTitle>Ključni pokazatelji performansi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  label: 'Količina goriva',
                  current: state.comparisonData.current.totalQuantityLiters,
                  previous: state.comparisonData.previous.totalQuantityLiters,
                  growth: state.comparisonData.comparison.quantityGrowth,
                  unit: 'L',
                },
                {
                  label: 'Prihod',
                  current: state.comparisonData.current.totalRevenue,
                  previous: state.comparisonData.previous.totalRevenue,
                  growth: state.comparisonData.comparison.revenueGrowth,
                  unit: 'BAM',
                  isCurrency: true,
                },
                {
                  label: 'Broj operacija',
                  current: state.comparisonData.current.operationsCount,
                  previous: state.comparisonData.previous.operationsCount,
                  growth: state.comparisonData.comparison.operationsGrowth,
                  unit: '',
                },
              ].map((kpi) => {
                const trendIndicator = getTrendIndicator(kpi.growth);
                const TrendIcon = trendIndicator.icon;

                return (
                  <div key={kpi.label} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-600">{kpi.label}</h4>
                      <div className={`p-1 rounded-full ${trendIndicator.bgColor}`}>
                        <TrendIcon className={`h-4 w-4 ${trendIndicator.color}`} />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">
                        {kpi.isCurrency 
                          ? formatNumber(kpi.current, { style: 'currency', currency: 'BAM' })
                          : `${formatNumber(kpi.current)} ${kpi.unit}`
                        }
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Prethodni: {kpi.isCurrency 
                          ? formatNumber(kpi.previous, { style: 'currency', currency: 'BAM' })
                          : `${formatNumber(kpi.previous)} ${kpi.unit}`
                        }
                      </div>
                      
                      <div className={`text-sm font-medium ${trendIndicator.color}`}>
                        {formatPercentage(kpi.growth)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Destination Trending */}
      {renderDestinationTrending()}

      {/* Market Share Summary */}
      {renderMarketShareSummary()}
    </div>
  );
};

export default ComparativeAnalysisTab; 