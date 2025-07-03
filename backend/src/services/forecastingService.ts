/**
 * forecastingService.ts
 * Servisni sloj za prognoziranje potrošnje goriva
 */

import { PrismaClient } from '@prisma/client';
import { convertToBAM } from '../utils/currencyConverter';

// Inicijalizacija Prisma klijenta
const prisma = new PrismaClient();

/**
 * Interfejsi za forecasting
 */
interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

interface HistoricalDataPoint {
  period: string;
  date: Date;
  value: number;
  trend?: number;
  seasonal?: number;
}

interface ForecastDataPoint {
  period: string;
  date: Date;
  predicted: number;
  confidence_lower: number;
  confidence_upper: number;
  trend_component: number;
  seasonal_component: number;
}

interface LinearTrendForecast {
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  trendLine: {
    slope: number;
    intercept: number;
    r_squared: number;
  };
  seasonalFactors: Record<number, number>; // month -> seasonal factor
  accuracy: {
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
}

interface MovingAverageForecast {
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  movingAverageWindow: number;
  accuracy: {
    mae: number;
    mape: number;
    rmse: number;
  };
}

interface ExponentialSmoothingForecast {
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  alpha: number; // smoothing parameter
  beta?: number; // trend smoothing parameter
  gamma?: number; // seasonal smoothing parameter
  accuracy: {
    mae: number;
    mape: number;
    rmse: number;
  };
}

interface DestinationForecast {
  destination: string;
  historicalData: HistoricalDataPoint[];
  forecast: ForecastDataPoint[];
  growthTrend: 'increasing' | 'decreasing' | 'stable';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Helper funkcija za konverziju revenue u BAM
 */
function calculateRevenueInBAM(operation: any): number {
  const operationRevenue = Number(operation.price_per_kg) * Number(operation.quantity_kg);
  
  if (operation.currency === 'USD' && operation.usd_exchange_rate) {
    return convertToBAM(operationRevenue, 'USD', Number(operation.usd_exchange_rate));
  } else if (operation.currency === 'EUR') {
    return convertToBAM(operationRevenue, 'EUR');
  } else {
    return operationRevenue;
  }
}

/**
 * Helper funkcija za računanje linearne regresije
 */
function calculateLinearRegression(dataPoints: { x: number, y: number }[]): {
  slope: number;
  intercept: number;
  r_squared: number;
} {
  const n = dataPoints.length;
  if (n < 2) return { slope: 0, intercept: 0, r_squared: 0 };

  const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
  const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
  const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);
  const sumYY = dataPoints.reduce((sum, point) => sum + point.y * point.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared calculation
  const yMean = sumY / n;
  const totalSumSquares = dataPoints.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0);
  const residualSumSquares = dataPoints.reduce((sum, point) => {
    const predicted = slope * point.x + intercept;
    return sum + Math.pow(point.y - predicted, 2);
  }, 0);
  
  const r_squared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

  return { slope, intercept, r_squared };
}

/**
 * Helper funkcija za računanje sezonskih faktora
 */
function calculateSeasonalFactors(historicalData: HistoricalDataPoint[]): Record<number, number> {
  const monthlyData: Record<number, number[]> = {};
  
  // Grupiraj podatke po mjesecima
  historicalData.forEach(point => {
    const month = point.date.getMonth();
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(point.value);
  });

  // Izračunaj prosijek za svaki mjesec
  const monthlyAverages: Record<number, number> = {};
  Object.keys(monthlyData).forEach(monthStr => {
    const month = parseInt(monthStr);
    const values = monthlyData[month];
    monthlyAverages[month] = values.reduce((sum, val) => sum + val, 0) / values.length;
  });

  // Izračunaj općeniti prosijek
  const overallAverage = Object.values(monthlyAverages).reduce((sum, avg) => sum + avg, 0) / Object.keys(monthlyAverages).length;

  // Izračunaj sezonske faktore
  const seasonalFactors: Record<number, number> = {};
  Object.keys(monthlyAverages).forEach(monthStr => {
    const month = parseInt(monthStr);
    seasonalFactors[month] = overallAverage > 0 ? monthlyAverages[month] / overallAverage : 1;
  });

  return seasonalFactors;
}

/**
 * Helper funkcija za računanje accuracy metrika
 */
function calculateAccuracy(actual: number[], predicted: number[]): {
  mae: number;
  mape: number;
  rmse: number;
} {
  if (actual.length !== predicted.length || actual.length === 0) {
    return { mae: 0, mape: 0, rmse: 0 };
  }

  const n = actual.length;
  let mae = 0;
  let mape = 0;
  let rmse = 0;

  for (let i = 0; i < n; i++) {
    const error = Math.abs(actual[i] - predicted[i]);
    mae += error;
    
    if (actual[i] !== 0) {
      mape += Math.abs(error / actual[i]) * 100;
    }
    
    rmse += Math.pow(actual[i] - predicted[i], 2);
  }

  mae /= n;
  mape /= n;
  rmse = Math.sqrt(rmse / n);

  return { mae, mape, rmse };
}

/**
 * Generiše linearnu trend prognozu
 */
export async function generateLinearTrendForecast(
  filter: DateRangeFilter,
  forecastMonths: number
): Promise<LinearTrendForecast> {
  
  // Dohvati historijske podatke
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      },
      is_deleted: false // Ne uključujemo obrisane operacije
    }
  }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters));

  // Grupiraj po mjesecima
  const monthlyData: Record<string, number> = {};
  operations.forEach(op => {
    const date = new Date(op.dateTime);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = 0;
    }
    monthlyData[yearMonth] += Number(op.quantity_liters || 0);
  });

  // Stvori historijske data points
  const historicalData: HistoricalDataPoint[] = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value], index) => ({
      period,
      date: new Date(period + '-01'),
      value,
      trend: index
    }));

  // Pripremi podatke za linearnu regresiju
  const regressionData = historicalData.map((point, index) => ({
    x: index,
    y: point.value
  }));

  // Izračunaj linearnu regresiju
  const trendLine = calculateLinearRegression(regressionData);

  // Izračunaj sezonske faktore
  const seasonalFactors = calculateSeasonalFactors(historicalData);

  // Generiraj prognozu
  const forecast: ForecastDataPoint[] = [];
  const lastDataIndex = historicalData.length - 1;
  
  for (let i = 1; i <= forecastMonths; i++) {
    const futureIndex = lastDataIndex + i;
    const lastDate = historicalData[lastDataIndex].date;
    const futureDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
    const futureMonth = futureDate.getMonth();
    
    // Trend komponenta
    const trendComponent = trendLine.slope * futureIndex + trendLine.intercept;
    
    // Sezonska komponenta
    const seasonalFactor = seasonalFactors[futureMonth] || 1;
    const seasonalComponent = trendComponent * seasonalFactor;
    
    // Confidence interval (približno ±10% za jednostavnost)
    const confidenceMargin = seasonalComponent * 0.1;
    
    forecast.push({
      period: `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`,
      date: futureDate,
      predicted: seasonalComponent,
      confidence_lower: seasonalComponent - confidenceMargin,
      confidence_upper: seasonalComponent + confidenceMargin,
      trend_component: trendComponent,
      seasonal_component: seasonalComponent - trendComponent
    });
  }

  // Izračunaj accuracy na postojećim podacima
  const predictedValues = historicalData.map((_, index) => trendLine.slope * index + trendLine.intercept);
  const actualValues = historicalData.map(point => point.value);
  const accuracy = calculateAccuracy(actualValues, predictedValues);

  return {
    historicalData,
    forecast,
    trendLine,
    seasonalFactors,
    accuracy
  };
}

/**
 * Generiše prognozu pomoću moving average
 */
export async function generateMovingAverageForecast(
  filter: DateRangeFilter,
  forecastMonths: number,
  windowSize: number = 3
): Promise<MovingAverageForecast> {
  
  // Dohvati historijske podatke (identično kao u LinearTrendForecast)
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      },
      is_deleted: false // Ne uključujemo obrisane operacije
    }
  }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters));

  // Grupiraj po mjesecima
  const monthlyData: Record<string, number> = {};
  operations.forEach(op => {
    const date = new Date(op.dateTime);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = 0;
    }
    monthlyData[yearMonth] += Number(op.quantity_liters || 0);
  });

  // Stvori historijske data points
  const historicalData: HistoricalDataPoint[] = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({
      period,
      date: new Date(period + '-01'),
      value
    }));

  // Generiraj prognozu pomoću moving average
  const forecast: ForecastDataPoint[] = [];
  const lastDataIndex = historicalData.length - 1;
  
  // Izračunaj početni moving average
  let movingAverage = 0;
  if (historicalData.length >= windowSize) {
    const lastWindow = historicalData.slice(-windowSize);
    movingAverage = lastWindow.reduce((sum, point) => sum + point.value, 0) / windowSize;
  }
  
  for (let i = 1; i <= forecastMonths; i++) {
    const lastDate = historicalData[lastDataIndex].date;
    const futureDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
    
    // Za jednostavnost, koristimo isti moving average za sve buduće periode
    const predicted = movingAverage;
    const confidenceMargin = predicted * 0.15; // ±15% za moving average
    
    forecast.push({
      period: `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`,
      date: futureDate,
      predicted,
      confidence_lower: predicted - confidenceMargin,
      confidence_upper: predicted + confidenceMargin,
      trend_component: predicted,
      seasonal_component: 0
    });
  }

  // Izračunaj accuracy
  const predictedValues: number[] = [];
  const actualValues: number[] = [];
  
  for (let i = windowSize; i < historicalData.length; i++) {
    const window = historicalData.slice(i - windowSize, i);
    const ma = window.reduce((sum, point) => sum + point.value, 0) / windowSize;
    predictedValues.push(ma);
    actualValues.push(historicalData[i].value);
  }
  
  const accuracy = calculateAccuracy(actualValues, predictedValues);

  return {
    historicalData,
    forecast,
    movingAverageWindow: windowSize,
    accuracy
  };
}

/**
 * Generiše prognozu po destinacijama
 */
export async function generateDestinationForecasts(
  filter: DateRangeFilter,
  forecastMonths: number
): Promise<DestinationForecast[]> {
  
  // Dohvati historijske podatke sa destinacijama
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      },
      is_deleted: false // Ne uključujemo obrisane operacije
    }
  }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters && op.destination));

  // Grupiraj po destinaciji i mjesecu
  const destinationMonthlyData: Record<string, Record<string, number>> = {};
  
  operations.forEach(op => {
    const destination = op.destination!;
    const date = new Date(op.dateTime);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!destinationMonthlyData[destination]) {
      destinationMonthlyData[destination] = {};
    }
    if (!destinationMonthlyData[destination][yearMonth]) {
      destinationMonthlyData[destination][yearMonth] = 0;
    }
    destinationMonthlyData[destination][yearMonth] += Number(op.quantity_liters || 0);
  });

  // Generiraj prognoze za svaku destinaciju
  const destinationForecasts: DestinationForecast[] = [];
  
  for (const [destination, monthlyData] of Object.entries(destinationMonthlyData)) {
    // Stvori historijske data points
    const historicalData: HistoricalDataPoint[] = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => ({
        period,
        date: new Date(period + '-01'),
        value
      }));

    if (historicalData.length < 3) continue; // Preskačemo destinacije s premalo podataka

    // Jednostavna linearna prognoza
    const regressionData = historicalData.map((point, index) => ({
      x: index,
      y: point.value
    }));
    
    const trendLine = calculateLinearRegression(regressionData);
    
    // Generiraj prognozu
    const forecast: ForecastDataPoint[] = [];
    const lastDataIndex = historicalData.length - 1;
    
    for (let i = 1; i <= forecastMonths; i++) {
      const futureIndex = lastDataIndex + i;
      const lastDate = historicalData[lastDataIndex].date;
      const futureDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
      
      const predicted = trendLine.slope * futureIndex + trendLine.intercept;
      const confidenceMargin = Math.abs(predicted) * 0.2; // ±20%
      
      forecast.push({
        period: `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`,
        date: futureDate,
        predicted: Math.max(0, predicted), // Ne može biti negativna potrošnja
        confidence_lower: Math.max(0, predicted - confidenceMargin),
        confidence_upper: predicted + confidenceMargin,
        trend_component: predicted,
        seasonal_component: 0
      });
    }

    // Odredi trend i confidence
    const growthTrend = trendLine.slope > 50 ? 'increasing' : trendLine.slope < -50 ? 'decreasing' : 'stable';
    const confidence = trendLine.r_squared > 0.7 ? 'high' : trendLine.r_squared > 0.3 ? 'medium' : 'low';

    destinationForecasts.push({
      destination,
      historicalData,
      forecast,
      growthTrend,
      confidence
    });
  }

  // Sortiranje po ukupnoj potrošnji u historijskim podacima
  return destinationForecasts.sort((a, b) => {
    const totalA = a.historicalData.reduce((sum, point) => sum + point.value, 0);
    const totalB = b.historicalData.reduce((sum, point) => sum + point.value, 0);
    return totalB - totalA;
  });
}

/**
 * Generiše jednostavnu eksponencijalnu smoothing prognozu
 */
export async function generateExponentialSmoothingForecast(
  filter: DateRangeFilter,
  forecastMonths: number,
  alpha: number = 0.3
): Promise<ExponentialSmoothingForecast> {
  
  // Dohvati historijske podatke
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      },
      is_deleted: false // Ne uključujemo obrisane operacije
    }
  }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters));

  // Grupiraj po mjesecima
  const monthlyData: Record<string, number> = {};
  operations.forEach(op => {
    const date = new Date(op.dateTime);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = 0;
    }
    monthlyData[yearMonth] += Number(op.quantity_liters || 0);
  });

  // Stvori historijske data points
  const historicalData: HistoricalDataPoint[] = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({
      period,
      date: new Date(period + '-01'),
      value
    }));

  if (historicalData.length === 0) {
    return {
      historicalData: [],
      forecast: [],
      alpha,
      accuracy: { mae: 0, mape: 0, rmse: 0 }
    };
  }

  // Izračunaj exponential smoothing
  const smoothedValues: number[] = [];
  smoothedValues[0] = historicalData[0].value; // Početna vrijednost
  
  for (let i = 1; i < historicalData.length; i++) {
    smoothedValues[i] = alpha * historicalData[i].value + (1 - alpha) * smoothedValues[i - 1];
  }

  // Generiraj prognozu
  const forecast: ForecastDataPoint[] = [];
  const lastSmoothedValue = smoothedValues[smoothedValues.length - 1];
  const lastDataIndex = historicalData.length - 1;
  
  for (let i = 1; i <= forecastMonths; i++) {
    const lastDate = historicalData[lastDataIndex].date;
    const futureDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
    
    // Za jednostavno exponential smoothing, prognoza je konstantna
    const predicted = lastSmoothedValue;
    const confidenceMargin = predicted * 0.12; // ±12%
    
    forecast.push({
      period: `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`,
      date: futureDate,
      predicted,
      confidence_lower: predicted - confidenceMargin,
      confidence_upper: predicted + confidenceMargin,
      trend_component: predicted,
      seasonal_component: 0
    });
  }

  // Izračunaj accuracy
  const actualValues = historicalData.slice(1).map(point => point.value);
  const predictedValues = smoothedValues.slice(1);
  const accuracy = calculateAccuracy(actualValues, predictedValues);

  return {
    historicalData,
    forecast,
    alpha,
    accuracy
  };
} 