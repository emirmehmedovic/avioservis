/**
 * comparativeAnalysisService.ts
 * Servisni sloj za komparativnu analizu potrošnje goriva
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { convertToBAM } from '../utils/currencyConverter';

// Inicijalizacija Prisma klijenta
const prisma = new PrismaClient();

/**
 * Interfejsi za komparativnu analizu
 */
interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

interface PeriodComparisonData {
  current: {
    period: string;
    startDate: Date;
    endDate: Date;
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
    startDate: Date;
    endDate: Date;
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

interface DestinationTrendingData {
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

interface AirlineTrendingData {
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

interface MarketShareAnalysis {
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
    marketConcentration: number; // Herfindahl index
  };
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
 * Helper funkcija za računanje rasta između dva perioda
 */
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Helper funkcija za određivanje statusa trenda
 */
function getTrendStatus(growthRate: number): 'growing' | 'declining' | 'stable' {
  if (growthRate > 5) return 'growing';
  if (growthRate < -5) return 'declining';
  return 'stable';
}

/**
 * Helper funkcija za računanje Herfindahl indeksa
 */
function calculateHerfindahlIndex(marketShares: number[]): number {
  return marketShares.reduce((sum, share) => sum + (share / 100) ** 2, 0) * 10000;
}

/**
 * Generiše poređenje između dva perioda (mjesec-na-mjesec)
 */
export async function generateMonthlyComparison(currentMonth: Date): Promise<PeriodComparisonData> {
  // Definiši trenutni mjesec
  const currentStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const currentEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
  
  // Definiši prethodni mjesec
  const previousStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const previousEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0, 23, 59, 59);

  // Dohvati podatke za oba perioda
  const [currentOps, previousOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: { dateTime: { gte: currentStart, lte: currentEnd } },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: { dateTime: { gte: previousStart, lte: previousEnd } },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);

  // Izračunaj statistike za trenutni period
  const currentStats = calculatePeriodStats(currentOps, currentStart, currentEnd, 'current');
  const previousStats = calculatePeriodStats(previousOps, previousStart, previousEnd, 'previous');

  // Izračunaj poređenje
  const comparison = {
    quantityGrowth: calculateGrowthRate(currentStats.totalQuantityLiters, previousStats.totalQuantityLiters),
    revenueGrowth: calculateGrowthRate(currentStats.totalRevenue, previousStats.totalRevenue),
    operationsGrowth: calculateGrowthRate(currentStats.operationsCount, previousStats.operationsCount),
    avgSizeGrowth: calculateGrowthRate(currentStats.avgOperationSize, previousStats.avgOperationSize),
    destinationsGrowth: calculateGrowthRate(currentStats.uniqueDestinations, previousStats.uniqueDestinations),
    airlinesGrowth: calculateGrowthRate(currentStats.uniqueAirlines, previousStats.uniqueAirlines)
  };

  return {
    current: currentStats,
    previous: previousStats,
    comparison
  };
}

/**
 * Generiše poređenje između dva perioda (godina-na-godinu)
 */
export async function generateYearlyComparison(currentYear: number): Promise<PeriodComparisonData> {
  // Definiši trenutnu godinu
  const currentStart = new Date(currentYear, 0, 1);
  const currentEnd = new Date(currentYear, 11, 31, 23, 59, 59);
  
  // Definiši prethodnu godinu
  const previousStart = new Date(currentYear - 1, 0, 1);
  const previousEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59);

  // Dohvati podatke za oba perioda
  const [currentOps, previousOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: { dateTime: { gte: currentStart, lte: currentEnd } },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: { dateTime: { gte: previousStart, lte: previousEnd } },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);

  // Izračunaj statistike za oba perioda
  const currentStats = calculatePeriodStats(currentOps, currentStart, currentEnd, `${currentYear}`);
  const previousStats = calculatePeriodStats(previousOps, previousStart, previousEnd, `${currentYear - 1}`);

  // Izračunaj poređenje
  const comparison = {
    quantityGrowth: calculateGrowthRate(currentStats.totalQuantityLiters, previousStats.totalQuantityLiters),
    revenueGrowth: calculateGrowthRate(currentStats.totalRevenue, previousStats.totalRevenue),
    operationsGrowth: calculateGrowthRate(currentStats.operationsCount, previousStats.operationsCount),
    avgSizeGrowth: calculateGrowthRate(currentStats.avgOperationSize, previousStats.avgOperationSize),
    destinationsGrowth: calculateGrowthRate(currentStats.uniqueDestinations, previousStats.uniqueDestinations),
    airlinesGrowth: calculateGrowthRate(currentStats.uniqueAirlines, previousStats.uniqueAirlines)
  };

  return {
    current: currentStats,
    previous: previousStats,
    comparison
  };
}

/**
 * Generiše analizu trending destinacija
 */
export async function generateDestinationTrendingAnalysis(
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<DestinationTrendingData[]> {
  
  // Dohvati podatke za oba perioda
  const [currentOps, previousOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: currentPeriod.startDate, lte: currentPeriod.endDate }
      }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: previousPeriod.startDate, lte: previousPeriod.endDate }
      }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);

  // Grupiraj by destination za trenutni period
  const currentDestinations = groupByDestination(currentOps);
  const previousDestinations = groupByDestination(previousOps);

  // Izračunaj ukupne količine za market share
  const currentTotal = currentOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const previousTotal = previousOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);

  // Stvori analizu za svaku destinaciju
  const allDestinations = new Set([
    ...Object.keys(currentDestinations),
    ...Object.keys(previousDestinations)
  ]);

  const destinationAnalysis: DestinationTrendingData[] = [];

  for (const destination of allDestinations) {
    const current = currentDestinations[destination] || { quantity: 0, revenue: 0, operations: 0 };
    const previous = previousDestinations[destination] || { quantity: 0, revenue: 0, operations: 0 };

    const currentMarketShare = currentTotal > 0 ? (current.quantity / currentTotal) * 100 : 0;
    const previousMarketShare = previousTotal > 0 ? (previous.quantity / previousTotal) * 100 : 0;

    const growth = {
      quantityGrowth: calculateGrowthRate(current.quantity, previous.quantity),
      revenueGrowth: calculateGrowthRate(current.revenue, previous.revenue),
      operationsGrowth: calculateGrowthRate(current.operations, previous.operations),
      marketShareChange: currentMarketShare - previousMarketShare
    };

    destinationAnalysis.push({
      destination,
      current: {
        quantity: current.quantity,
        revenue: current.revenue,
        operations: current.operations,
        marketShare: currentMarketShare
      },
      previous: {
        quantity: previous.quantity,
        revenue: previous.revenue,
        operations: previous.operations,
        marketShare: previousMarketShare
      },
      growth,
      status: getTrendStatus(growth.quantityGrowth)
    });
  }

  // Sortiranje po growth rate (od najvećeg ka najmanjem)
  return destinationAnalysis.sort((a, b) => b.growth.quantityGrowth - a.growth.quantityGrowth);
}

/**
 * Generiše analizu market share
 */
export async function generateMarketShareAnalysis(
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<MarketShareAnalysis> {
  
  // Dohvati destinacije i airline trending
  const [destinationTrending, airlineTrending] = await Promise.all([
    generateDestinationTrendingAnalysis(currentPeriod, previousPeriod),
    generateAirlineTrendingAnalysis(currentPeriod, previousPeriod)
  ]);

  // Izračunaj ukupni market
  const currentTotal = destinationTrending.reduce((sum, d) => sum + d.current.quantity, 0);
  const previousTotal = destinationTrending.reduce((sum, d) => sum + d.previous.quantity, 0);

  // Izračunaj market concentration (Herfindahl index)
  const destinationMarketShares = destinationTrending.map(d => d.current.marketShare);
  const marketConcentration = calculateHerfindahlIndex(destinationMarketShares);

  // Izračunaj summary statistike
  const summary = {
    growingDestinations: destinationTrending.filter(d => d.status === 'growing').length,
    decliningDestinations: destinationTrending.filter(d => d.status === 'declining').length,
    stableDestinations: destinationTrending.filter(d => d.status === 'stable').length,
    growingAirlines: airlineTrending.filter(a => a.status === 'growing').length,
    decliningAirlines: airlineTrending.filter(a => a.status === 'declining').length,
    stableAirlines: airlineTrending.filter(a => a.status === 'stable').length,
    marketConcentration
  };

  return {
    totalMarket: {
      currentQuantity: currentTotal,
      previousQuantity: previousTotal,
      growthRate: calculateGrowthRate(currentTotal, previousTotal)
    },
    destinationAnalysis: destinationTrending,
    airlineAnalysis: airlineTrending,
    summary
  };
}

/**
 * Generiše analizu trending aviokompanija
 */
export async function generateAirlineTrendingAnalysis(
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<AirlineTrendingData[]> {
  
  // Dohvati podatke za oba perioda sa airline informacijama
  const [currentOps, previousOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: currentPeriod.startDate, lte: currentPeriod.endDate }
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: previousPeriod.startDate, lte: previousPeriod.endDate }
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);

  // Grupiraj by airline za oba perioda
  const currentAirlines = groupByAirline(currentOps);
  const previousAirlines = groupByAirline(previousOps);

  // Izračunaj ukupne količine za market share
  const currentTotal = currentOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const previousTotal = previousOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);

  // Stvori analizu za svaku aviokompaniju
  const allAirlines = new Set([
    ...Object.keys(currentAirlines),
    ...Object.keys(previousAirlines)
  ]);

  const airlineAnalysis: AirlineTrendingData[] = [];

  for (const airlineKey of allAirlines) {
    const current = currentAirlines[airlineKey] || { 
      quantity: 0, revenue: 0, operations: 0, airlineId: 0, airlineName: '' 
    };
    const previous = previousAirlines[airlineKey] || { 
      quantity: 0, revenue: 0, operations: 0, airlineId: 0, airlineName: '' 
    };

    const currentMarketShare = currentTotal > 0 ? (current.quantity / currentTotal) * 100 : 0;
    const previousMarketShare = previousTotal > 0 ? (previous.quantity / previousTotal) * 100 : 0;

    const growth = {
      quantityGrowth: calculateGrowthRate(current.quantity, previous.quantity),
      revenueGrowth: calculateGrowthRate(current.revenue, previous.revenue),
      operationsGrowth: calculateGrowthRate(current.operations, previous.operations),
      marketShareChange: currentMarketShare - previousMarketShare
    };

    airlineAnalysis.push({
      airlineId: current.airlineId || previous.airlineId,
      airlineName: current.airlineName || previous.airlineName || `Airline ${airlineKey}`,
      current: {
        quantity: current.quantity,
        revenue: current.revenue,
        operations: current.operations,
        marketShare: currentMarketShare
      },
      previous: {
        quantity: previous.quantity,
        revenue: previous.revenue,
        operations: previous.operations,
        marketShare: previousMarketShare
      },
      growth,
      status: getTrendStatus(growth.quantityGrowth)
    });
  }

  // Sortiranje po growth rate (od najvećeg ka najmanjem)
  return airlineAnalysis.sort((a, b) => b.growth.quantityGrowth - a.growth.quantityGrowth);
}

/**
 * Helper funkcije
 */
function calculatePeriodStats(
  operations: any[], 
  startDate: Date, 
  endDate: Date, 
  period: string
) {
  const totalQuantityLiters = operations.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const totalQuantityKg = operations.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
  const totalRevenue = operations.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0);
  const operationsCount = operations.length;
  const avgOperationSize = operationsCount > 0 ? totalQuantityLiters / operationsCount : 0;
  
  const uniqueDestinations = new Set(
    operations.map(op => op.destination).filter(Boolean)
  ).size;
  
  const uniqueAirlines = new Set(
    operations.map(op => op.airline_id).filter(Boolean)
  ).size;

  return {
    period,
    startDate,
    endDate,
    totalQuantityLiters,
    totalQuantityKg,
    totalRevenue,
    operationsCount,
    avgOperationSize,
    uniqueDestinations,
    uniqueAirlines
  };
}

function groupByDestination(operations: any[]) {
  const groups: Record<string, { quantity: number; revenue: number; operations: number }> = {};
  
  operations.forEach(op => {
    const destination = op.destination || 'Unknown';
    
    if (!groups[destination]) {
      groups[destination] = { quantity: 0, revenue: 0, operations: 0 };
    }
    
    groups[destination].quantity += Number(op.quantity_liters || 0);
    groups[destination].revenue += calculateRevenueInBAM(op);
    groups[destination].operations += 1;
  });
  
  return groups;
}

function groupByAirline(operations: any[]) {
  const groups: Record<string, { 
    quantity: number; 
    revenue: number; 
    operations: number; 
    airlineId: number; 
    airlineName: string 
  }> = {};
  
  operations.forEach(op => {
    const airlineKey = op.airline_id ? op.airline_id.toString() : 'unknown';
    
    if (!groups[airlineKey]) {
      groups[airlineKey] = { 
        quantity: 0, 
        revenue: 0, 
        operations: 0,
        airlineId: op.airline_id || 0,
        airlineName: op.airline?.name || 'Unknown Airline'
      };
    }
    
    groups[airlineKey].quantity += Number(op.quantity_liters || 0);
    groups[airlineKey].revenue += calculateRevenueInBAM(op);
    groups[airlineKey].operations += 1;
  });
  
  return groups;
} 