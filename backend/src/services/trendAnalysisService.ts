/**
 * trendAnalysisService.ts
 * Servisni sloj za analizu trendova potrošnje goriva
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { convertToBAM } from '../utils/currencyConverter';

// Inicijalizacija Prisma klijenta
const prisma = new PrismaClient();

/**
 * Interfejsi za trend analizu
 */
interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

interface TrendDataPoint {
  period: string;
  date: Date;
  quantity_liters: number;
  quantity_kg: number;
  revenue: number;
  operations_count: number;
  growth_rate?: number;
  moving_average?: number;
}

interface WeeklyTrendData {
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

interface MonthlyTrendData {
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

interface YearOverYearData {
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

interface SeasonalPattern {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  averageConsumption: number;
  seasonalIndex: number;
  months: {
    month: string;
    consumption: number;
    index: number;
  }[];
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
 * Helper funkcija za računanje moving average
 */
function calculateMovingAverage(data: number[], windowSize: number, index: number): number {
  const start = Math.max(0, index - windowSize + 1);
  const end = index + 1;
  const slice = data.slice(start, end);
  return slice.reduce((sum, val) => sum + val, 0) / slice.length;
}

/**
 * Generiše sedmični trend podatke
 */
export async function generateWeeklyTrendData(filter: DateRangeFilter): Promise<WeeklyTrendData> {
  // Dohvati sve operacije točenja unutar datumskog opsega
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      }
    },
    orderBy: {
      dateTime: 'asc'
    }
  }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters));

  // Grupiraj po sedmicama
  const weeklyGroups = new Map<string, any[]>();
  
  operations.forEach(op => {
    const date = new Date(op.dateTime);
    const yearWeek = getYearWeek(date);
    
    if (!weeklyGroups.has(yearWeek)) {
      weeklyGroups.set(yearWeek, []);
    }
    weeklyGroups.get(yearWeek)!.push(op);
  });

  // Stvori trendne podatke
  const weeklyData: TrendDataPoint[] = [];
  const sortedWeeks = Array.from(weeklyGroups.keys()).sort();

  sortedWeeks.forEach((week, index) => {
    const weekOps = weeklyGroups.get(week)!;
    const totalQuantityLiters = weekOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
    const totalQuantityKg = weekOps.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
    const totalRevenue = weekOps.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0);
    
    const dataPoint: TrendDataPoint = {
      period: week,
      date: getDateFromYearWeek(week),
      quantity_liters: totalQuantityLiters,
      quantity_kg: totalQuantityKg,
      revenue: totalRevenue,
      operations_count: weekOps.length
    };

    // Računaj growth rate u odnosu na prethodnu sedmicu
    if (index > 0) {
      const previousQuantity = weeklyData[index - 1].quantity_liters;
      dataPoint.growth_rate = calculateGrowthRate(totalQuantityLiters, previousQuantity);
    }

    // Računaj 4-sedmični moving average
    const quantities = weeklyData.map(d => d.quantity_liters).concat([totalQuantityLiters]);
    dataPoint.moving_average = calculateMovingAverage(quantities, 4, quantities.length - 1);

    weeklyData.push(dataPoint);
  });

  // Stvori summary
  const summary = {
    totalGrowthRate: weeklyData.length > 1 ? 
      calculateGrowthRate(weeklyData[weeklyData.length - 1].quantity_liters, weeklyData[0].quantity_liters) : 0,
    averageWeeklyGrowth: weeklyData
      .filter(d => d.growth_rate !== undefined)
      .reduce((sum, d, _, arr) => sum + (d.growth_rate! / arr.length), 0),
    strongestGrowthWeek: weeklyData
      .filter(d => d.growth_rate !== undefined)
      .reduce((max, d) => !max || d.growth_rate! > max.growth_rate! ? d : max, null as TrendDataPoint | null)?.period || '',
    weakestGrowthWeek: weeklyData
      .filter(d => d.growth_rate !== undefined)
      .reduce((min, d) => !min || d.growth_rate! < min.growth_rate! ? d : min, null as TrendDataPoint | null)?.period || '',
    totalOperations: weeklyData.reduce((sum, d) => sum + d.operations_count, 0),
    totalQuantityLiters: weeklyData.reduce((sum, d) => sum + d.quantity_liters, 0),
    totalRevenue: weeklyData.reduce((sum, d) => sum + d.revenue, 0)
  };

  return { weeklyData, summary };
}

/**
 * Generiše mjesečni trend podatke
 */
export async function generateMonthlyTrendData(filter: DateRangeFilter): Promise<MonthlyTrendData> {
  // Dohvati sve operacije točenja unutar datumskog opsega
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      }
    },
    orderBy: {
      dateTime: 'asc'
    }
  }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters));

  // Grupiraj po mjesecima
  const monthlyGroups = new Map<string, any[]>();
  
  operations.forEach(op => {
    const date = new Date(op.dateTime);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyGroups.has(yearMonth)) {
      monthlyGroups.set(yearMonth, []);
    }
    monthlyGroups.get(yearMonth)!.push(op);
  });

  // Stvori trendne podatke
  const monthlyData: TrendDataPoint[] = [];
  const sortedMonths = Array.from(monthlyGroups.keys()).sort();

  sortedMonths.forEach((month, index) => {
    const monthOps = monthlyGroups.get(month)!;
    const totalQuantityLiters = monthOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
    const totalQuantityKg = monthOps.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
    const totalRevenue = monthOps.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0);
    
    const dataPoint: TrendDataPoint = {
      period: month,
      date: new Date(month + '-01'),
      quantity_liters: totalQuantityLiters,
      quantity_kg: totalQuantityKg,
      revenue: totalRevenue,
      operations_count: monthOps.length
    };

    // Računaj growth rate u odnosu na prethodni mjesec
    if (index > 0) {
      const previousQuantity = monthlyData[index - 1].quantity_liters;
      dataPoint.growth_rate = calculateGrowthRate(totalQuantityLiters, previousQuantity);
    }

    // Računaj 3-mjesečni moving average
    const quantities = monthlyData.map(d => d.quantity_liters).concat([totalQuantityLiters]);
    dataPoint.moving_average = calculateMovingAverage(quantities, 3, quantities.length - 1);

    monthlyData.push(dataPoint);
  });

  // Stvori summary
  const summary = {
    totalGrowthRate: monthlyData.length > 1 ? 
      calculateGrowthRate(monthlyData[monthlyData.length - 1].quantity_liters, monthlyData[0].quantity_liters) : 0,
    averageMonthlyGrowth: monthlyData
      .filter(d => d.growth_rate !== undefined)
      .reduce((sum, d, _, arr) => sum + (d.growth_rate! / arr.length), 0),
    strongestGrowthMonth: monthlyData
      .filter(d => d.growth_rate !== undefined)
      .reduce((max, d) => !max || d.growth_rate! > max.growth_rate! ? d : max, null as TrendDataPoint | null)?.period || '',
    weakestGrowthMonth: monthlyData
      .filter(d => d.growth_rate !== undefined)
      .reduce((min, d) => !min || d.growth_rate! < min.growth_rate! ? d : min, null as TrendDataPoint | null)?.period || '',
    totalOperations: monthlyData.reduce((sum, d) => sum + d.operations_count, 0),
    totalQuantityLiters: monthlyData.reduce((sum, d) => sum + d.quantity_liters, 0),
    totalRevenue: monthlyData.reduce((sum, d) => sum + d.revenue, 0)
  };

  return { monthlyData, summary };
}

/**
 * Generiše year-over-year poredbu
 */
export async function generateYearOverYearData(year: number): Promise<YearOverYearData> {
  const currentYearStart = new Date(year, 0, 1);
  const currentYearEnd = new Date(year, 11, 31, 23, 59, 59);
  const previousYearStart = new Date(year - 1, 0, 1);
  const previousYearEnd = new Date(year - 1, 11, 31, 23, 59, 59);

  // Dohvati podatke za obje godine
  const [currentYearOps, previousYearOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: currentYearStart, lte: currentYearEnd }
      }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: previousYearStart, lte: previousYearEnd }
      }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);

  // Grupiraj po mjesecima za obje godine
  const currentMonthlyData = groupByMonth(currentYearOps, year);
  const previousMonthlyData = groupByMonth(previousYearOps, year - 1);

  // Stvori poredbu
  const monthlyComparisons = [];
  const monthNames = [
    'Januari', 'Februari', 'Mart', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  for (let month = 0; month < 12; month++) {
    const currentData = currentMonthlyData[month];
    const previousData = previousMonthlyData[month];
    
    monthlyComparisons.push({
      month: monthNames[month],
      currentYear: currentData?.quantity_liters || 0,
      previousYear: previousData?.quantity_liters || 0,
      growthRate: calculateGrowthRate(
        currentData?.quantity_liters || 0,
        previousData?.quantity_liters || 0
      )
    });
  }

  const totalCurrentYear = currentMonthlyData.reduce((sum, data) => sum + (data?.quantity_liters || 0), 0);
  const totalPreviousYear = previousMonthlyData.reduce((sum, data) => sum + (data?.quantity_liters || 0), 0);

  return {
    currentYear: currentMonthlyData.filter(d => d !== null) as TrendDataPoint[],
    previousYear: previousMonthlyData.filter(d => d !== null) as TrendDataPoint[],
    comparison: {
      totalGrowthRate: calculateGrowthRate(totalCurrentYear, totalPreviousYear),
      monthlyComparisons
    }
  };
}

/**
 * Generiše sezonske uzorke
 */
export async function generateSeasonalPatterns(filter: DateRangeFilter): Promise<SeasonalPattern[]> {
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: filter.startDate,
        lte: filter.endDate
      }
    }
  }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters));

  // Grupiraj po mjesecima
  const monthlyConsumption = new Array(12).fill(0);
  const monthCounts = new Array(12).fill(0);

  operations.forEach(op => {
    const month = new Date(op.dateTime).getMonth();
    monthlyConsumption[month] += Number(op.quantity_liters || 0);
    monthCounts[month]++;
  });

  // Izračunaj prosječnu potrošnju za svaki mjesec
  const averageConsumption = monthlyConsumption.map((total, i) => 
    monthCounts[i] > 0 ? total / monthCounts[i] : 0
  );

  // Izračunaj godišnji prosjek
  const yearlyAverage = averageConsumption.reduce((sum, val) => sum + val, 0) / 12;

  // Definiši sezone
  const seasons = [
    { name: 'spring' as const, months: [2, 3, 4] }, // Mart, April, Maj
    { name: 'summer' as const, months: [5, 6, 7] }, // Juni, Juli, August
    { name: 'autumn' as const, months: [8, 9, 10] }, // Septembar, Oktobar, Novembar
    { name: 'winter' as const, months: [11, 0, 1] }  // Decembar, Januari, Februari
  ];

  const monthNames = [
    'Januari', 'Februari', 'Mart', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  return seasons.map(season => {
    const seasonalConsumption = season.months.reduce((sum, month) => sum + averageConsumption[month], 0);
    const seasonalAverage = seasonalConsumption / season.months.length;
    const seasonalIndex = yearlyAverage > 0 ? (seasonalAverage / yearlyAverage) * 100 : 100;

    return {
      season: season.name,
      averageConsumption: seasonalAverage,
      seasonalIndex,
      months: season.months.map(month => ({
        month: monthNames[month],
        consumption: averageConsumption[month],
        index: yearlyAverage > 0 ? (averageConsumption[month] / yearlyAverage) * 100 : 100
      }))
    };
  });
}

/**
 * Helper funkcije
 */
function getYearWeek(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getDateFromYearWeek(yearWeek: string): Date {
  const [year, week] = yearWeek.split('-W');
  const startOfYear = new Date(parseInt(year), 0, 1);
  const days = (parseInt(week) - 1) * 7;
  return new Date(startOfYear.getTime() + days * 24 * 60 * 60 * 1000);
}

function groupByMonth(operations: any[], year: number): (TrendDataPoint | null)[] {
  const monthlyData: (TrendDataPoint | null)[] = new Array(12).fill(null);
  
  const monthlyGroups = new Map<number, any[]>();
  
  operations.forEach(op => {
    const month = new Date(op.dateTime).getMonth();
    if (!monthlyGroups.has(month)) {
      monthlyGroups.set(month, []);
    }
    monthlyGroups.get(month)!.push(op);
  });

  monthlyGroups.forEach((ops, month) => {
    const totalQuantityLiters = ops.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
    const totalQuantityKg = ops.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
    const totalRevenue = ops.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0);
    
    monthlyData[month] = {
      period: `${year}-${String(month + 1).padStart(2, '0')}`,
      date: new Date(year, month, 1),
      quantity_liters: totalQuantityLiters,
      quantity_kg: totalQuantityKg,
      revenue: totalRevenue,
      operations_count: ops.length
    };
  });

  return monthlyData;
} 