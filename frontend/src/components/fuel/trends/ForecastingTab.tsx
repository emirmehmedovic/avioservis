/**
 * ForecastingTab.tsx
 * Komponenta za prognozu potrošnje goriva s različitim metodama
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Slider } from '@/components/ui/slider'; // Not available in this project
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, Brain, BarChart3, Target, Activity, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import TrendChart from './TrendChart';
import FuelReportsTrendsApi from '../../../services/fuelReportsTrendsApi';

import type {
  ForecastingState,
  ForecastingFilters,
  LinearTrendForecast,
  MovingAverageForecast,
  ExponentialSmoothingForecast,
  DestinationForecast,
  ChartSeries,
  HistoricalDataPoint,
  ForecastDataPoint,
} from '../../../types/fuelReportsTrends.types';

const ForecastingTab: React.FC = () => {
  // State management
  const [state, setState] = useState<ForecastingState>({
    isLoading: false,
    error: null,
    filters: {
      historicalPeriod: {
        startDate: FuelReportsTrendsApi.dates.formatDateForAPI(
          FuelReportsTrendsApi.dates.getDateMonthsAgo(12)
        ),
        endDate: FuelReportsTrendsApi.dates.formatDateForAPI(new Date()),
      },
      forecastMonths: 6,
      method: 'linear',
      parameters: {
        windowSize: 3,
        alpha: 0.3,
        beta: 0.1,
        gamma: 0.1,
      },
    },
    linearForecast: null,
    movingAverageForecast: null,
    exponentialForecast: null,
    destinationForecasts: null,
  });

  // Date picker states
  const [startDate, setStartDate] = useState<Date | undefined>(
    FuelReportsTrendsApi.dates.getDateMonthsAgo(12)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // Load forecast data based on current filters
  const loadForecastData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { historicalPeriod, forecastMonths, method, parameters } = state.filters;

      switch (method) {
        case 'linear':
          const linearForecast = await FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.forecasting.getLinearTrendForecast(historicalPeriod, forecastMonths)
          );
          setState(prev => ({ ...prev, linearForecast, isLoading: false }));
          break;

        case 'moving-average':
          const movingAverageForecast = await FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.forecasting.getMovingAverageForecast(
              historicalPeriod, 
              forecastMonths, 
              parameters?.windowSize || 3
            )
          );
          setState(prev => ({ ...prev, movingAverageForecast, isLoading: false }));
          break;

        case 'exponential':
          const exponentialForecast = await FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.forecasting.getExponentialSmoothingForecast(
              historicalPeriod, 
              forecastMonths, 
              parameters?.alpha || 0.3
            )
          );
          setState(prev => ({ ...prev, exponentialForecast, isLoading: false }));
          break;

        case 'destinations':
          const destinationForecasts = await FuelReportsTrendsApi.withErrorHandling(() =>
            FuelReportsTrendsApi.forecasting.getDestinationForecasts(historicalPeriod, forecastMonths)
          );
          setState(prev => ({ ...prev, destinationForecasts, isLoading: false }));
          break;
      }

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Greška prilikom učitavanja prognoze',
      }));
    }
  }, [state.filters]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  // Handle date range change
  const handleDateRangeChange = () => {
    if (startDate && endDate) {
      const newDateRange = {
        startDate: FuelReportsTrendsApi.dates.formatDateForAPI(startDate),
        endDate: FuelReportsTrendsApi.dates.formatDateForAPI(endDate),
      };
      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, historicalPeriod: newDateRange },
      }));
    }
  };

  // Handle method change
  const handleMethodChange = (method: 'linear' | 'moving-average' | 'exponential' | 'destinations') => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, method },
      // Clear previous forecasts
      linearForecast: null,
      movingAverageForecast: null,
      exponentialForecast: null,
      destinationForecasts: null,
    }));
  };

  // Handle forecast months change
  const handleForecastMonthsChange = (months: number) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, forecastMonths: months },
    }));
  };

  // Handle parameters change
  const handleParameterChange = (paramName: string, value: number) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        parameters: { ...prev.filters.parameters, [paramName]: value },
      },
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

  // Get accuracy color based on value
  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy > 90) return 'text-green-600 bg-green-100';
    if (accuracy > 70) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  // Convert forecast data to chart format
  const convertForecastToChartData = (): ChartSeries[] => {
    const { method } = state.filters;
    let historicalData: HistoricalDataPoint[] = [];
    let forecastData: ForecastDataPoint[] = [];

    switch (method) {
      case 'linear':
        if (state.linearForecast) {
          historicalData = state.linearForecast.historicalData;
          forecastData = state.linearForecast.forecast;
        }
        break;
      case 'moving-average':
        if (state.movingAverageForecast) {
          historicalData = state.movingAverageForecast.historicalData;
          forecastData = state.movingAverageForecast.forecast;
        }
        break;
      case 'exponential':
        if (state.exponentialForecast) {
          historicalData = state.exponentialForecast.historicalData;
          forecastData = state.exponentialForecast.forecast;
        }
        break;
      default:
        return [];
    }

    const series: ChartSeries[] = [];

    // Historical data series
    if (historicalData.length > 0) {
      series.push({
        name: 'Historijski podaci',
        data: historicalData.map(point => ({
          x: point.period,
          y: point.value,
        })),
        color: '#2563eb',
        type: 'line',
      });
    }

    // Forecast data series
    if (forecastData.length > 0) {
      series.push({
        name: 'Prognoza',
        data: forecastData.map(point => ({
          x: point.period,
          y: point.predicted,
        })),
        color: '#16a34a',
        type: 'line',
      });

      // Confidence interval
      series.push({
        name: 'Donja granica (95%)',
        data: forecastData.map(point => ({
          x: point.period,
          y: point.confidence_lower,
        })),
        color: '#94a3b8',
        type: 'line',
      });

      series.push({
        name: 'Gornja granica (95%)',
        data: forecastData.map(point => ({
          x: point.period,
          y: point.confidence_upper,
        })),
        color: '#94a3b8',
        type: 'line',
      });
    }

    return series;
  };

  // Render method-specific parameters
  const renderMethodParameters = () => {
    const { method, parameters } = state.filters;

    switch (method) {
      case 'moving-average':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Window Size: {parameters?.windowSize || 3}</label>
                             <input
                 type="range"
                 value={parameters?.windowSize || 3}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange('windowSize', parseInt(e.target.value))}
                 max={12}
                 min={2}
                 step={1}
                 className="mt-2 w-full"
               />
              <div className="text-xs text-gray-500 mt-1">
                Broj mjeseci za izračun pomičnog prosjeka
              </div>
            </div>
          </div>
        );

      case 'exponential':
        return (
          <div className="space-y-4">
                         <div>
               <label className="text-sm font-medium">Alpha (α): {parameters?.alpha?.toFixed(2) || '0.30'}</label>
               <input
                 type="range"
                 value={parameters?.alpha || 0.3}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange('alpha', parseFloat(e.target.value))}
                 max={1}
                 min={0.1}
                 step={0.05}
                 className="mt-2 w-full"
               />
               <div className="text-xs text-gray-500 mt-1">
                 Faktor smoothing-a za osnovni trend
               </div>
             </div>
             <div>
               <label className="text-sm font-medium">Beta (β): {parameters?.beta?.toFixed(2) || '0.10'}</label>
               <input
                 type="range"
                 value={parameters?.beta || 0.1}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange('beta', parseFloat(e.target.value))}
                 max={1}
                 min={0.05}
                 step={0.05}
                 className="mt-2 w-full"
               />
               <div className="text-xs text-gray-500 mt-1">
                 Faktor smoothing-a za trend komponentu
               </div>
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render accuracy metrics
  const renderAccuracyMetrics = () => {
    const { method } = state.filters;
    let accuracy = null;

    switch (method) {
      case 'linear':
        accuracy = state.linearForecast?.accuracy;
        break;
      case 'moving-average':
        accuracy = state.movingAverageForecast?.accuracy;
        break;
      case 'exponential':
        accuracy = state.exponentialForecast?.accuracy;
        break;
    }

    if (!accuracy) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metrieke tačnosti prognoze</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {accuracy.mae.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">MAE (Mean Absolute Error)</div>
              <div className="text-xs text-gray-500 mt-1">Prosječna apsolutna greška</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold inline-flex items-center px-2 py-1 rounded-full ${getAccuracyColor(100 - accuracy.mape)}`}>
                {(100 - accuracy.mape).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Tačnost (100% - MAPE)</div>
              <div className="text-xs text-gray-500 mt-1">Procenat tačnosti prognoze</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {accuracy.rmse.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">RMSE (Root Mean Square Error)</div>
              <div className="text-xs text-gray-500 mt-1">Koren srednje kvadratne greške</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render destination forecasts
  const renderDestinationForecasts = () => {
    if (!state.destinationForecasts || state.destinationForecasts.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Prognoze po destinacijama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {state.destinationForecasts.slice(0, 8).map((destination) => (
              <div key={destination.destination} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{destination.destination}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      destination.growthTrend === 'increasing' ? 'default' :
                      destination.growthTrend === 'decreasing' ? 'destructive' : 'secondary'
                    }>
                      {destination.growthTrend === 'increasing' ? 'Rast' :
                       destination.growthTrend === 'decreasing' ? 'Pad' : 'Stabilno'}
                    </Badge>
                    <Badge variant={
                      destination.confidence === 'high' ? 'default' :
                      destination.confidence === 'medium' ? 'secondary' : 'outline'
                    }>
                      {destination.confidence === 'high' ? 'Visoka pouzdanost' :
                       destination.confidence === 'medium' ? 'Srednja pouzdanost' : 'Niska pouzdanost'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Trenutna potrošnja:</div>
                    <div className="font-medium">
                      {destination.historicalData.length > 0 
                        ? formatNumber(destination.historicalData[destination.historicalData.length - 1].value)
                        : 'N/A'
                      } L
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Prognoza za sljedeći mjesec:</div>
                    <div className="font-medium">
                      {destination.forecast.length > 0 
                        ? formatNumber(destination.forecast[0].predicted)
                        : 'N/A'
                      } L
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
            <Brain className="h-5 w-5" />
            Prognoze potrošnje goriva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Historical Period */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Istorijski period od:</label>
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

            {/* Forecasting Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Metoda prognoze:</label>
              <Select
                value={state.filters.method}
                onValueChange={(value: 'linear' | 'moving-average' | 'exponential' | 'destinations') =>
                  handleMethodChange(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linearni trend</SelectItem>
                  <SelectItem value="moving-average">Pomični prosjek</SelectItem>
                  <SelectItem value="exponential">Exponential Smoothing</SelectItem>
                  <SelectItem value="destinations">Po destinacijama</SelectItem>
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
                {state.isLoading ? 'Generira...' : 'Generiraj prognozu'}
              </Button>
            </div>
          </div>

          {/* Forecast Duration */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">
              Prognoza za: {state.filters.forecastMonths} mjesec{state.filters.forecastMonths > 1 ? 'i' : ''}
            </label>
                         <input
               type="range"
               value={state.filters.forecastMonths}
               onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleForecastMonthsChange(parseInt(e.target.value))}
               max={12}
               min={1}
               step={1}
               className="w-full"
             />
          </div>

          {/* Method-specific parameters */}
          {renderMethodParameters()}
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

      {/* Main Forecast Chart */}
      {state.filters.method !== 'destinations' && (
        <TrendChart
          title={`Prognoza potrošnje - ${
            state.filters.method === 'linear' ? 'Linearni trend' :
            state.filters.method === 'moving-average' ? 'Pomični prosjek' :
            'Exponential Smoothing'
          }`}
          data={convertForecastToChartData()}
          height={400}
          xAxisLabel="Period"
          yAxisLabel="Količina (L)"
        />
      )}

      {/* Accuracy Metrics */}
      {renderAccuracyMetrics()}

      {/* Destination Forecasts */}
      {state.filters.method === 'destinations' && renderDestinationForecasts()}
    </div>
  );
};

export default ForecastingTab; 