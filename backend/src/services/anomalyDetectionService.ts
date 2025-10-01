/**
 * anomalyDetectionService.ts
 * Servisni sloj za detekciju anomalija i generiranje upozorenja
 */

import { PrismaClient } from '@prisma/client';
import { convertToBAM } from '../utils/currencyConverter';

// Inicijalizacija Prisma klijenta
const prisma = new PrismaClient();

/**
 * Interfejsi za anomaly detection
 */
interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

interface AnomalyAlert {
  id: string;
  type: 'destination_decline' | 'airline_decline' | 'volume_spike' | 'volume_drop' | 'revenue_anomaly' | 'operational_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntity: {
    type: 'destination' | 'airline' | 'overall';
    id?: number;
    name: string;
  };
  metrics: {
    current: number;
    previous: number;
    changePercent: number;
    threshold: number;
  };
  detectedAt: Date;
  period: {
    current: DateRangeFilter;
    previous: DateRangeFilter;
  };
  recommendations: string[];
}

interface AnomalyDetectionResult {
  alerts: AnomalyAlert[];
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    affectedDestinations: number;
    affectedAirlines: number;
  };
  trends: {
    improvingEntities: { type: string; name: string; improvement: number }[];
    decliningEntities: { type: string; name: string; decline: number }[];
  };
}

/**
 * Konfiguracija threshold-a za različite tipove anomalija
 */
const ANOMALY_THRESHOLDS = {
  DESTINATION_DECLINE: {
    medium: -15,    // >15% pad
    high: -25,      // >25% pad  
    critical: -40   // >40% pad
  },
  AIRLINE_DECLINE: {
    medium: -15,
    high: -25,
    critical: -40
  },
  VOLUME_SPIKE: {
    medium: 50,     // >50% rast
    high: 100,      // >100% rast
    critical: 200   // >200% rast
  },
  VOLUME_DROP: {
    medium: -20,    // >20% pad
    high: -35,      // >35% pad
    critical: -50   // >50% pad
  },
  REVENUE_ANOMALY: {
    medium: 30,     // >30% promjena
    high: 50,       // >50% promjena
    critical: 75    // >75% promjena
  }
};

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
 * Helper funkcija za određivanje severity na osnovu threshold-a
 */
function determineSeverity(changePercent: number, thresholds: any): 'low' | 'medium' | 'high' | 'critical' {
  const absChange = Math.abs(changePercent);
  
  if (absChange >= Math.abs(thresholds.critical)) return 'critical';
  if (absChange >= Math.abs(thresholds.high)) return 'high';
  if (absChange >= Math.abs(thresholds.medium)) return 'medium';
  return 'low';
}

/**
 * Generiše ID za anomaly alert
 */
function generateAlertId(type: string, entityName: string, period: string): string {
  return `${type}_${entityName.replace(/\s+/g, '_').toLowerCase()}_${period}`;
}

/**
 * Glavna funkcija za detekciju anomalija
 */
export async function detectAnomalies(
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<AnomalyDetectionResult> {
  
  const alerts: AnomalyAlert[] = [];
  
  // Dohvati podatke za oba perioda
  const [currentOps, previousOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: currentPeriod.startDate, lte: currentPeriod.endDate },
        is_deleted: false
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
        is_deleted: false
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);

  // 1. Detekcija anomalija po destinacijama
  const destinationAlerts = await detectDestinationAnomalies(currentOps, previousOps, currentPeriod, previousPeriod);
  alerts.push(...destinationAlerts);

  // 2. Detekcija anomalija po aviokompanijama
  const airlineAlerts = await detectAirlineAnomalies(currentOps, previousOps, currentPeriod, previousPeriod);
  alerts.push(...airlineAlerts);

  // 3. Detekcija općenitih volume anomalija
  const volumeAlerts = await detectVolumeAnomalies(currentOps, previousOps, currentPeriod, previousPeriod);
  alerts.push(...volumeAlerts);

  // 4. Detekcija revenue anomalija
  const revenueAlerts = await detectRevenueAnomalies(currentOps, previousOps, currentPeriod, previousPeriod);
  alerts.push(...revenueAlerts);

  // Sortiranje po severity (critical -> high -> medium -> low)
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  alerts.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  // Generiraj summary
  const summary = {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    highAlerts: alerts.filter(a => a.severity === 'high').length,
    mediumAlerts: alerts.filter(a => a.severity === 'medium').length,
    lowAlerts: alerts.filter(a => a.severity === 'low').length,
    affectedDestinations: new Set(alerts.filter(a => a.affectedEntity.type === 'destination').map(a => a.affectedEntity.name)).size,
    affectedAirlines: new Set(alerts.filter(a => a.affectedEntity.type === 'airline').map(a => a.affectedEntity.name)).size
  };

  // Generiraj trends
  const improvingEntities: { type: string; name: string; improvement: number }[] = [];
  const decliningEntities: { type: string; name: string; decline: number }[] = [];

  alerts.forEach(alert => {
    if (alert.metrics.changePercent > 10) {
      improvingEntities.push({
        type: alert.affectedEntity.type,
        name: alert.affectedEntity.name,
        improvement: alert.metrics.changePercent
      });
    } else if (alert.metrics.changePercent < -10) {
      decliningEntities.push({
        type: alert.affectedEntity.type,
        name: alert.affectedEntity.name,
        decline: Math.abs(alert.metrics.changePercent)
      });
    }
  });

  return {
    alerts,
    summary,
    trends: {
      improvingEntities: improvingEntities.sort((a, b) => b.improvement - a.improvement).slice(0, 10),
      decliningEntities: decliningEntities.sort((a, b) => b.decline - a.decline).slice(0, 10)
    }
  };
}

/**
 * Detekcija anomalija po destinacijama
 */
async function detectDestinationAnomalies(
  currentOps: any[],
  previousOps: any[],
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<AnomalyAlert[]> {
  
  const alerts: AnomalyAlert[] = [];
  
  // Grupiraj po destinaciji
  const currentDestinations = groupByDestination(currentOps);
  const previousDestinations = groupByDestination(previousOps);
  
  // Analiziraj svaku destinaciju
  const allDestinations = new Set([...Object.keys(currentDestinations), ...Object.keys(previousDestinations)]);
  
  for (const destination of allDestinations) {
    const current = currentDestinations[destination] || { quantity: 0, revenue: 0, operations: 0 };
    const previous = previousDestinations[destination] || { quantity: 0, revenue: 0, operations: 0 };
    
    const quantityChange = calculateGrowthRate(current.quantity, previous.quantity);
    const revenueChange = calculateGrowthRate(current.revenue, previous.revenue);
    const operationsChange = calculateGrowthRate(current.operations, previous.operations);
    
    // Provjeri quantity decline
    if (quantityChange <= ANOMALY_THRESHOLDS.DESTINATION_DECLINE.medium) {
      const severity = determineSeverity(quantityChange, ANOMALY_THRESHOLDS.DESTINATION_DECLINE);
      
      alerts.push({
        id: generateAlertId('destination_decline', destination, 'quantity'),
        type: 'destination_decline',
        severity,
        title: `Pad potrošnje za destinaciju ${destination}`,
        description: `Destinacija ${destination} pokazuje značajan pad u potrošnji goriva od ${Math.abs(quantityChange).toFixed(1)}% u odnosu na prethodni period.`,
        affectedEntity: {
          type: 'destination',
          name: destination
        },
        metrics: {
          current: current.quantity,
          previous: previous.quantity,
          changePercent: quantityChange,
          threshold: ANOMALY_THRESHOLDS.DESTINATION_DECLINE.medium
        },
        detectedAt: new Date(),
        period: {
          current: currentPeriod,
          previous: previousPeriod
        },
        recommendations: [
          'Istražiti razloge smanjene aktivnosti na ovoj destinaciji',
          'Kontaktirati aviokompanje koje lete na ovu destinaciju',
          'Analizirati konkurentske cijene za ovu rutu',
          'Razmotriti marketing kampanje za povećanje prometa'
        ]
      });
    }
    
    // Provjeri operations decline
    if (operationsChange <= -20 && previous.operations > 5) { // Samo ako je bilo značajno operacija
      alerts.push({
        id: generateAlertId('destination_decline', destination, 'operations'),
        type: 'destination_decline',
        severity: operationsChange <= -40 ? 'high' : 'medium',
        title: `Pad broja operacija za destinaciju ${destination}`,
        description: `Broj letova za destinaciju ${destination} se smanjio za ${Math.abs(operationsChange).toFixed(1)}%.`,
        affectedEntity: {
          type: 'destination',
          name: destination
        },
        metrics: {
          current: current.operations,
          previous: previous.operations,
          changePercent: operationsChange,
          threshold: -20
        },
        detectedAt: new Date(),
        period: {
          current: currentPeriod,
          previous: previousPeriod
        },
        recommendations: [
          'Analizirati promjene u rasporedu letova',
          'Provjeriti da li su aviokompanje promijenile rute',
          'Istražiti sezonske faktore'
        ]
      });
    }
  }
  
  return alerts;
}

/**
 * Detekcija anomalija po aviokompanijama
 */
async function detectAirlineAnomalies(
  currentOps: any[],
  previousOps: any[],
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<AnomalyAlert[]> {
  
  const alerts: AnomalyAlert[] = [];
  
  // Grupiraj po aviokompaniji
  const currentAirlines = groupByAirline(currentOps);
  const previousAirlines = groupByAirline(previousOps);
  
  // Analiziraj svaku aviokompaniju
  const allAirlines = new Set([...Object.keys(currentAirlines), ...Object.keys(previousAirlines)]);
  
  for (const airlineKey of allAirlines) {
    const current = currentAirlines[airlineKey] || { quantity: 0, revenue: 0, operations: 0, airlineName: '' };
    const previous = previousAirlines[airlineKey] || { quantity: 0, revenue: 0, operations: 0, airlineName: '' };
    
    const airlineName = current.airlineName || previous.airlineName || `Airline ${airlineKey}`;
    const quantityChange = calculateGrowthRate(current.quantity, previous.quantity);
    const revenueChange = calculateGrowthRate(current.revenue, previous.revenue);
    
    // Provjeri airline decline
    if (quantityChange <= ANOMALY_THRESHOLDS.AIRLINE_DECLINE.medium && previous.quantity > 1000) {
      const severity = determineSeverity(quantityChange, ANOMALY_THRESHOLDS.AIRLINE_DECLINE);
      
      alerts.push({
        id: generateAlertId('airline_decline', airlineName, 'quantity'),
        type: 'airline_decline',
        severity,
        title: `Pad potrošnje aviokompanje ${airlineName}`,
        description: `Aviokompanija ${airlineName} pokazuje pad u potrošnji od ${Math.abs(quantityChange).toFixed(1)}%.`,
        affectedEntity: {
          type: 'airline',
          id: current.airlineId || previous.airlineId,
          name: airlineName
        },
        metrics: {
          current: current.quantity,
          previous: previous.quantity,
          changePercent: quantityChange,
          threshold: ANOMALY_THRESHOLDS.AIRLINE_DECLINE.medium
        },
        detectedAt: new Date(),
        period: {
          current: currentPeriod,
          previous: previousPeriod
        },
        recommendations: [
          'Kontaktirati aviokompaniju za objašnjenje smanjene aktivnosti',
          'Provjeriti konkurentske cijene',
          'Analizirati promjene u njihovom rasporedu letova',
          'Razmotriti posebne uslove ili popuste'
        ]
      });
    }
  }
  
  return alerts;
}

/**
 * Detekcija općenitih volume anomalija
 */
async function detectVolumeAnomalies(
  currentOps: any[],
  previousOps: any[],
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<AnomalyAlert[]> {
  
  const alerts: AnomalyAlert[] = [];
  
  const currentTotal = currentOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const previousTotal = previousOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const totalChange = calculateGrowthRate(currentTotal, previousTotal);
  
  // Volume spike detection
  if (totalChange >= ANOMALY_THRESHOLDS.VOLUME_SPIKE.medium) {
    const severity = determineSeverity(totalChange, ANOMALY_THRESHOLDS.VOLUME_SPIKE);
    
    alerts.push({
      id: generateAlertId('volume_spike', 'overall', 'total'),
      type: 'volume_spike',
      severity,
      title: `Neočekivani rast ukupne potrošnje`,
      description: `Ukupna potrošnja goriva je porasla za ${totalChange.toFixed(1)}% u odnosu na prethodni period.`,
      affectedEntity: {
        type: 'overall',
        name: 'Ukupna potrošnja'
      },
      metrics: {
        current: currentTotal,
        previous: previousTotal,
        changePercent: totalChange,
        threshold: ANOMALY_THRESHOLDS.VOLUME_SPIKE.medium
      },
      detectedAt: new Date(),
      period: {
        current: currentPeriod,
        previous: previousPeriod
      },
      recommendations: [
        'Provjeriti da li je rast planiran ili neočekivan',
        'Analizirati koje destinacije/aviokompanje doprinose rastu',
        'Osigurati dovoljne zalihe goriva',
        'Razmotriti capacity planning za buduće periode'
      ]
    });
  }
  
  // Volume drop detection
  if (totalChange <= ANOMALY_THRESHOLDS.VOLUME_DROP.medium) {
    const severity = determineSeverity(totalChange, ANOMALY_THRESHOLDS.VOLUME_DROP);
    
    alerts.push({
      id: generateAlertId('volume_drop', 'overall', 'total'),
      type: 'volume_drop',
      severity,
      title: `Značajan pad ukupne potrošnje`,
      description: `Ukupna potrošnja goriva je pala za ${Math.abs(totalChange).toFixed(1)}% u odnosu na prethodni period.`,
      affectedEntity: {
        type: 'overall',
        name: 'Ukupna potrošnja'
      },
      metrics: {
        current: currentTotal,
        previous: previousTotal,
        changePercent: totalChange,
        threshold: ANOMALY_THRESHOLDS.VOLUME_DROP.medium
      },
      detectedAt: new Date(),
      period: {
        current: currentPeriod,
        previous: previousPeriod
      },
      recommendations: [
        'Istražiti uzroke pada potrošnje',
        'Provjeriti da li je pad sezonski ili strukturalni',
        'Analizirati konkurentsku situaciju',
        'Razmotriti marketing aktivnosti za povećanje prometa'
      ]
    });
  }
  
  return alerts;
}

/**
 * Detekcija revenue anomalija
 */
async function detectRevenueAnomalies(
  currentOps: any[],
  previousOps: any[],
  currentPeriod: DateRangeFilter,
  previousPeriod: DateRangeFilter
): Promise<AnomalyAlert[]> {
  
  const alerts: AnomalyAlert[] = [];
  
  const currentRevenue = currentOps.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0);
  const previousRevenue = previousOps.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0);
  const revenueChange = calculateGrowthRate(currentRevenue, previousRevenue);
  
  // Revenue anomaly detection
  if (Math.abs(revenueChange) >= ANOMALY_THRESHOLDS.REVENUE_ANOMALY.medium) {
    const severity = determineSeverity(revenueChange, ANOMALY_THRESHOLDS.REVENUE_ANOMALY);
    const isIncrease = revenueChange > 0;
    
    alerts.push({
      id: generateAlertId('revenue_anomaly', 'overall', isIncrease ? 'increase' : 'decrease'),
      type: 'revenue_anomaly',
      severity,
      title: `${isIncrease ? 'Rast' : 'Pad'} ukupnog prometa`,
      description: `Ukupni promet je ${isIncrease ? 'porastao' : 'pao'} za ${Math.abs(revenueChange).toFixed(1)}% u odnosu na prethodni period.`,
      affectedEntity: {
        type: 'overall',
        name: 'Ukupni promet'
      },
      metrics: {
        current: currentRevenue,
        previous: previousRevenue,
        changePercent: revenueChange,
        threshold: ANOMALY_THRESHOLDS.REVENUE_ANOMALY.medium
      },
      detectedAt: new Date(),
      period: {
        current: currentPeriod,
        previous: previousPeriod
      },
      recommendations: isIncrease ? [
        'Analizirati faktore koji doprinose rastu prometa',
        'Razmotriti da li je rast održiv',
        'Optimizirati operacije za povećani volumen',
        'Planirati investicije u infrastrukturu'
      ] : [
        'Istražiti uzroke pada prometa',
        'Analizirati promjene u cijenama goriva',
        'Provjeriti konkurentsku situaciju',
        'Razmotriti strategije za povećanje prometa'
      ]
    });
  }
  
  return alerts;
}

/**
 * Helper funkcije za grupiranje podataka
 */
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

/**
 * Generiše cached podatke za dashboard (poziva se periodično)
 */
export async function generateCachedAnalytics(): Promise<{
  lastWeekComparison: any;
  lastMonthComparison: any;
  lastYearComparison: any;
  performanceMetrics: any;
  dailyTrend: any[];
  topDestinations: { name: string; quantity: number; growth: number; operations: number; revenue: number }[];
  topAirlines: { name: string; quantity: number; growth: number; operations: number; revenue: number }[];
  recentAlerts: AnomalyAlert[];
}> {
  
  const now = new Date();
  
  // Definiraj periode za cache
  const currentWeekStart = getStartOfISOWeek(now);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
  
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(previousWeekStart);
  previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);
  
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Year comparison
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const currentYearEnd = new Date(now);
  const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const previousYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  // Generiraj osnovne komparacije
  const [weekComparison, monthComparison, yearComparison, anomalies] = await Promise.all([
    generateEnhancedComparison(
      { startDate: currentWeekStart, endDate: currentWeekEnd },
      { startDate: previousWeekStart, endDate: previousWeekEnd }
    ),
    generateEnhancedComparison(
      { startDate: currentMonthStart, endDate: currentMonthEnd },
      { startDate: previousMonthStart, endDate: previousMonthEnd }
    ),
    generateEnhancedComparison(
      { startDate: currentYearStart, endDate: currentYearEnd },
      { startDate: previousYearStart, endDate: previousYearEnd }
    ),
    detectAnomalies(
      { startDate: currentWeekStart, endDate: currentWeekEnd },
      { startDate: previousWeekStart, endDate: previousWeekEnd }
    )
  ]);

  // Generate monthly trend for the last 30 days
  const dailyTrend = await generateMonthlyTrend(now);

  // Performance metrics
  const performanceMetrics = await generatePerformanceMetrics(
    { startDate: currentWeekStart, endDate: currentWeekEnd }
  );
  
  return {
    lastWeekComparison: weekComparison,
    lastMonthComparison: monthComparison,
    lastYearComparison: yearComparison,
    performanceMetrics,
    dailyTrend,
    topDestinations: weekComparison.topDestinations || [],
    topAirlines: weekComparison.topAirlines || [],
    recentAlerts: anomalies.alerts.slice(0, 10) // Top 10 najvažnijih alerta
  };
}

/**
 * Helper funkcija za enhanced komparaciju (za cache)
 */
async function generateEnhancedComparison(currentPeriod: DateRangeFilter, previousPeriod: DateRangeFilter) {
  const [currentOps, previousOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: currentPeriod.startDate, lte: currentPeriod.endDate },
        is_deleted: false
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
        is_deleted: false
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);
  
  const currentTotal = currentOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const currentRevenue = currentOps.reduce((sum, op) => sum + Number(op.total_amount || 0), 0);
  const currentKg = currentOps.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
  
  const previousTotal = previousOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const previousRevenue = previousOps.reduce((sum, op) => sum + Number(op.total_amount || 0), 0);
  const previousKg = previousOps.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0);
  
  const growth = calculateGrowthRate(currentTotal, previousTotal);
  const revenueGrowth = calculateGrowthRate(currentRevenue, previousRevenue);
  const kgGrowth = calculateGrowthRate(currentKg, previousKg);
  
  // Top destinacije sa enhanced podacima
  const currentDestinations = groupByDestination(currentOps);
  const previousDestinations = groupByDestination(previousOps);
  
  const topDestinations = Object.entries(currentDestinations)
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      operations: data.operations,
      revenue: data.revenue,
      growth: calculateGrowthRate(data.quantity, previousDestinations[name]?.quantity || 0)
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  
  // Top aviokompanje sa enhanced podacima
  const currentAirlines = groupByAirline(currentOps);
  const previousAirlines = groupByAirline(previousOps);
  
  const topAirlines = Object.entries(currentAirlines)
    .map(([key, data]) => ({
      name: data.airlineName,
      quantity: data.quantity,
      operations: data.operations,
      revenue: data.revenue,
      growth: calculateGrowthRate(data.quantity, previousAirlines[key]?.quantity || 0)
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  
  return {
    totalQuantity: currentTotal,
    previousQuantity: previousTotal,
    growth,
    revenue: currentRevenue,
    revenueGrowth,
    kg: currentKg,
    kgGrowth,
    operationsCount: currentOps.length,
    topDestinations,
    topAirlines
  };
}

/**
 * Generiše monthly trend za poslednih 30 dana
 */
async function generateMonthlyTrend(now: Date) {
  const monthlyTrend = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    const dayOperations = await prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: dayStart, lte: dayEnd },
        is_deleted: false
      }
    });
    
    // Kalkuliraj revenue u BAM
    const revenueInBAM = dayOperations.reduce((sum, op) => {
      const amount = Number(op.total_amount || 0);
      const currency = op.currency || 'BAM';
      const exchangeRate = Number(op.usd_exchange_rate || 1);
      
      if (currency === 'USD' && exchangeRate > 0) {
        return sum + (amount * exchangeRate);
      }
      return sum + amount;
    }, 0);
    
    monthlyTrend.push({
      date: date.toISOString().split('T')[0],
      liters: dayOperations.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0),
      kg: dayOperations.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0),
      operations: dayOperations.length,
      revenue: revenueInBAM
    });
  }
  
  return monthlyTrend;
}

/**
 * Generiše performance metrije
 */
async function generatePerformanceMetrics(period: DateRangeFilter) {
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: { gte: period.startDate, lte: period.endDate },
      is_deleted: false
    }
  });
  
  const totalLiters = operations.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const totalRevenue = operations.reduce((sum, op) => sum + Number(op.total_amount || 0), 0);
  const totalOperations = operations.length;
  
  return {
    avgOperationSize: totalOperations > 0 ? totalLiters / totalOperations : 0,
    avgRevenuePerOperation: totalOperations > 0 ? totalRevenue / totalOperations : 0,
    avgRevenuePerLiter: totalLiters > 0 ? totalRevenue / totalLiters : 0,
    totalOperations,
    totalLiters,
    totalRevenue
  };
}

/**
 * Helper funkcija za osnovnu komparaciju (za cache)
 */
async function generateBasicComparison(currentPeriod: DateRangeFilter, previousPeriod: DateRangeFilter) {
  const [currentOps, previousOps] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: currentPeriod.startDate, lte: currentPeriod.endDate },
        is_deleted: false
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters)),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
        is_deleted: false
      },
      include: { airline: true }
    }).then(ops => ops.filter(op => op.quantity_kg && op.quantity_liters))
  ]);
  
  const currentTotal = currentOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const previousTotal = previousOps.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0);
  const growth = calculateGrowthRate(currentTotal, previousTotal);
  
  // Top destinacije
  const currentDestinations = groupByDestination(currentOps);
  const previousDestinations = groupByDestination(previousOps);
  
  const topDestinations = Object.entries(currentDestinations)
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      growth: calculateGrowthRate(data.quantity, previousDestinations[name]?.quantity || 0)
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  
  // Top aviokompanje
  const currentAirlines = groupByAirline(currentOps);
  const previousAirlines = groupByAirline(previousOps);
  
  const topAirlines = Object.entries(currentAirlines)
    .map(([key, data]) => ({
      name: data.airlineName,
      quantity: data.quantity,
      growth: calculateGrowthRate(data.quantity, previousAirlines[key]?.quantity || 0)
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  
  return {
    totalQuantity: currentTotal,
    previousQuantity: previousTotal,
    growth,
    operationsCount: currentOps.length,
    topDestinations,
    topAirlines
  };
}

/**
 * Helper funkcija za ISO week
 */
function getStartOfISOWeek(date: Date): Date {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr);
  target.setHours(0, 0, 0, 0);
  return target;
}
