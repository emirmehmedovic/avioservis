/**
 * analyticsComparison.controller.ts
 * Kontroleri za analitiku i komparaciju
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  generateWeeklyComparison,
  generateMonthlyComparison,
  generateYearlyComparison,
  generateDestinationTrendingAnalysis,
  generateAirlineTrendingAnalysis,
  generateAirlineComparisonAnalysis,
  generateMarketShareAnalysis
} from '../services/comparativeAnalysisService';
import { 
  generateWeeklyTrendData,
  generateMonthlyTrendData,
  generateYearOverYearData,
  generateSeasonalPatterns
} from '../services/trendAnalysisService';
import { 
  detectAnomalies,
  generateCachedAnalytics
} from '../services/anomalyDetectionService';
import { convertToBAM } from '../utils/currencyConverter';

const prisma = new PrismaClient();

/**
 * Helper funkcija za konverziju revenue u BAM
 * Koristi se kroz sve analytics funkcije za standardizaciju valuta
 */
function calculateRevenueInBAM(operation: any): number {
  // Prvo pokušaj sa total_amount ako postoji
  if (operation.total_amount && operation.total_amount > 0) {
    if (operation.currency === 'USD' && operation.usd_exchange_rate) {
      return convertToBAM(Number(operation.total_amount), 'USD', Number(operation.usd_exchange_rate));
    } else if (operation.currency === 'EUR') {
      return convertToBAM(Number(operation.total_amount), 'EUR');
    } else {
      // BAM ili nepoznata valuta - vraćamo direktno total_amount
      return Number(operation.total_amount);
    }
  }
  
  // Fallback: izračunaj iz price_per_kg * quantity_kg
  const operationRevenue = Number(operation.price_per_kg || 0) * Number(operation.quantity_kg || 0);
  
  if (operation.currency === 'USD' && operation.usd_exchange_rate) {
    return convertToBAM(operationRevenue, 'USD', Number(operation.usd_exchange_rate));
  } else if (operation.currency === 'EUR') {
    return convertToBAM(operationRevenue, 'EUR');
  } else {
    // BAM ili nepoznata valuta
    return operationRevenue;
  }
}

/**
 * GET /api/analytics/comparison/weekly
 */
export async function getWeeklyComparison(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    const comparison = await generateWeeklyComparison(targetDate);
    
    res.json({
      success: true,
      data: comparison,
      metadata: {
        generatedAt: new Date(),
        period: 'weekly',
        targetDate: targetDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating weekly comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly comparison',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/monthly
 */
export async function getMonthlyComparison(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    const comparison = await generateMonthlyComparison(targetDate);
    
    res.json({
      success: true,
      data: comparison,
      metadata: {
        generatedAt: new Date(),
        period: 'monthly',
        targetDate: targetDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating monthly comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly comparison',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/yearly
 */
export async function getYearlyComparison(req: Request, res: Response): Promise<void> {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    const comparison = await generateYearlyComparison(targetYear);
    
    res.json({
      success: true,
      data: comparison,
      metadata: {
        generatedAt: new Date(),
        period: 'yearly',
        targetYear
      }
    });
  } catch (error) {
    console.error('Error generating yearly comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate yearly comparison',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/analytics/comparison/custom
 */
export async function getCustomComparison(req: Request, res: Response): Promise<void> {
  try {
    const { 
      currentPeriod, 
      previousPeriod, 
      analysisType = 'destinations'
    } = req.body;
    
    if (!currentPeriod?.startDate || !currentPeriod?.endDate || 
        !previousPeriod?.startDate || !previousPeriod?.endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required date ranges',
        details: 'Both currentPeriod and previousPeriod must have startDate and endDate'
      });
      return;
    }
    
    const currentFilter = {
      startDate: new Date(currentPeriod.startDate),
      endDate: new Date(currentPeriod.endDate)
    };
    
    const previousFilter = {
      startDate: new Date(previousPeriod.startDate),
      endDate: new Date(previousPeriod.endDate)
    };
    
    let result;
    
    switch (analysisType) {
      case 'destinations':
        result = await generateDestinationTrendingAnalysis(currentFilter, previousFilter);
        break;
      case 'airlines':
        result = await generateAirlineTrendingAnalysis(currentFilter, previousFilter);
        break;
      case 'market-share':
        result = await generateMarketShareAnalysis(currentFilter, previousFilter);
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid analysis type',
          details: 'analysisType must be one of: destinations, airlines, market-share'
        });
        return;
    }
    
    res.json({
      success: true,
      data: result,
      metadata: {
        generatedAt: new Date(),
        analysisType,
        currentPeriod: currentFilter,
        previousPeriod: previousFilter
      }
    });
  } catch (error) {
    console.error('Error generating custom comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate custom comparison',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/analytics/comparison/airlines
 */
export async function getAirlineComparison(req: Request, res: Response): Promise<void> {
  try {
    const { 
      currentPeriod, 
      previousPeriod, 
      airlineIds 
    } = req.body;
    
    if (!currentPeriod?.startDate || !currentPeriod?.endDate || 
        !previousPeriod?.startDate || !previousPeriod?.endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required date ranges'
      });
      return;
    }
    
    const currentFilter = {
      startDate: new Date(currentPeriod.startDate),
      endDate: new Date(currentPeriod.endDate)
    };
    
    const previousFilter = {
      startDate: new Date(previousPeriod.startDate),
      endDate: new Date(previousPeriod.endDate)
    };
    
    const result = await generateAirlineComparisonAnalysis(
      currentFilter, 
      previousFilter, 
      airlineIds
    );
    
    res.json({
      success: true,
      data: result,
      metadata: {
        generatedAt: new Date(),
        currentPeriod: currentFilter,
        previousPeriod: previousFilter,
        filteredAirlines: airlineIds || 'all'
      }
    });
  } catch (error) {
    console.error('Error generating airline comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate airline comparison',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/trends/weekly
 */
export async function getWeeklyTrends(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'startDate and endDate are required'
      });
      return;
    }
    
    const filter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };
    
    const trends = await generateWeeklyTrendData(filter);
    
    res.json({
      success: true,
      data: trends,
      metadata: {
        generatedAt: new Date(),
        period: filter,
        dataPoints: trends.weeklyData.length
      }
    });
  } catch (error) {
    console.error('Error generating weekly trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/trends/monthly
 */
export async function getMonthlyTrends(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'startDate and endDate are required'
      });
      return;
    }
    
    const filter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };
    
    const trends = await generateMonthlyTrendData(filter);
    
    res.json({
      success: true,
      data: trends,
      metadata: {
        generatedAt: new Date(),
        period: filter,
        dataPoints: trends.monthlyData.length
      }
    });
  } catch (error) {
    console.error('Error generating monthly trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/trends/year-over-year
 */
export async function getYearOverYearTrends(req: Request, res: Response): Promise<void> {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    const trends = await generateYearOverYearData(targetYear);
    
    res.json({
      success: true,
      data: trends,
      metadata: {
        generatedAt: new Date(),
        targetYear,
        comparisonYear: targetYear - 1
      }
    });
  } catch (error) {
    console.error('Error generating year-over-year trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate year-over-year trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/trends/seasonal
 */
export async function getSeasonalPatterns(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'startDate and endDate are required'
      });
      return;
    }
    
    const filter = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };
    
    const patterns = await generateSeasonalPatterns(filter);
    
    res.json({
      success: true,
      data: patterns,
      metadata: {
        generatedAt: new Date(),
        period: filter,
        seasons: patterns.length
      }
    });
  } catch (error) {
    console.error('Error generating seasonal patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate seasonal patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/analytics/comparison/anomalies
 */
export async function getAnomalies(req: Request, res: Response): Promise<void> {
  try {
    const { currentPeriod, previousPeriod } = req.body;
    
    if (!currentPeriod?.startDate || !currentPeriod?.endDate || 
        !previousPeriod?.startDate || !previousPeriod?.endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required date ranges'
      });
      return;
    }
    
    const currentFilter = {
      startDate: new Date(currentPeriod.startDate),
      endDate: new Date(currentPeriod.endDate)
    };
    
    const previousFilter = {
      startDate: new Date(previousPeriod.startDate),
      endDate: new Date(previousPeriod.endDate)
    };
    
    const anomalies = await detectAnomalies(currentFilter, previousFilter);
    
    res.json({
      success: true,
      data: anomalies,
      metadata: {
        generatedAt: new Date(),
        currentPeriod: currentFilter,
        previousPeriod: previousFilter,
        totalAlerts: anomalies.summary.totalAlerts
      }
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect anomalies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/airlines
 * Dohvaća listu aviokompanija za filter
 */
export async function getAirlines(req: Request, res: Response): Promise<void> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const airlines = await prisma.airline.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      data: airlines,
      metadata: {
        generatedAt: new Date(),
        count: airlines.length
      }
    });
  } catch (error) {
    console.error('Error fetching airlines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch airlines',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/destinations
 * Dohvaća listu destinacija za filter
 */
export async function getDestinations(req: Request, res: Response): Promise<void> {
  try {
    const { airlineId } = req.query;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    let whereClause: any = {
      is_deleted: false
    };

    // Ako je specificirana aviokompanija, filtriraj destinacije samo za tu aviokompaniju
    if (airlineId) {
      whereClause.airlineId = parseInt(airlineId as string);
    }

    // Dohvati unique destinacije iz FuelingOperation tabele
    const destinations = await prisma.fuelingOperation.findMany({
      where: whereClause,
      select: {
        destination: true
      },
      distinct: ['destination'],
      orderBy: {
        destination: 'asc'
      }
    });

    // Transform to expected format
    const formattedDestinations = destinations.map((item, index) => ({
      id: index + 1, // Temporary ID since destination is just a string
      name: item.destination,
      code: item.destination.substring(0, 3).toUpperCase(), // Generate code from name
      country: 'N/A' // We don't have country info in current schema
    }));

    await prisma.$disconnect();

    res.json({
      success: true,
      data: formattedDestinations,
      metadata: {
        generatedAt: new Date(),
        count: formattedDestinations.length,
        filteredByAirline: !!airlineId
      }
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch destinations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/analytics/comparison/airline-destination
 * Komparacija po aviokompaniji i destinaciji
 */
export async function getAirlineDestinationComparison(req: Request, res: Response): Promise<void> {
  try {
    const { 
      currentPeriod, 
      previousPeriod, 
      airlineId,
      destinationId 
    } = req.body;
    
    if (!currentPeriod?.startDate || !currentPeriod?.endDate || 
        !previousPeriod?.startDate || !previousPeriod?.endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required date ranges'
      });
      return;
    }

    if (!airlineId && !destinationId) {
      res.status(400).json({
        success: false,
        error: 'Either airlineId or destinationId must be provided'
      });
      return;
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Build filter conditions
    let whereClause: any = {
      is_deleted: false
    };

    if (airlineId) {
      whereClause.airlineId = parseInt(airlineId);
    }

    if (destinationId) {
      // destinationId is actually the destination name from the frontend
      whereClause.destination = destinationId;
    }

    // Current period data
    const currentData = await prisma.fuelingOperation.findMany({
      where: {
        ...whereClause,
        dateTime: {
          gte: new Date(currentPeriod.startDate),
          lte: new Date(currentPeriod.endDate)
        }
      },
      include: {
        airline: {
          select: { name: true }
        }
      }
    });

    // Previous period data
    const previousData = await prisma.fuelingOperation.findMany({
      where: {
        ...whereClause,
        dateTime: {
          gte: new Date(previousPeriod.startDate),
          lte: new Date(previousPeriod.endDate)
        }
      },
      include: {
        airline: {
          select: { name: true }
        }
      }
    });

    await prisma.$disconnect();

    // Calculate totals with BAM conversion
    const currentTotals = {
      liters: currentData.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0),
      kg: currentData.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0),
      revenue: currentData.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0),
      operations: currentData.length
    };

    const previousTotals = {
      liters: previousData.reduce((sum, op) => sum + Number(op.quantity_liters || 0), 0),
      kg: previousData.reduce((sum, op) => sum + Number(op.quantity_kg || 0), 0),
      revenue: previousData.reduce((sum, op) => sum + calculateRevenueInBAM(op), 0),
      operations: previousData.length
    };

    // Calculate growth rates
    const growth = {
      liters: previousTotals.liters > 0 ? ((currentTotals.liters - previousTotals.liters) / previousTotals.liters) * 100 : 0,
      kg: previousTotals.kg > 0 ? ((currentTotals.kg - previousTotals.kg) / previousTotals.kg) * 100 : 0,
      revenue: previousTotals.revenue > 0 ? ((currentTotals.revenue - previousTotals.revenue) / previousTotals.revenue) * 100 : 0,
      operations: previousTotals.operations > 0 ? ((currentTotals.operations - previousTotals.operations) / previousTotals.operations) * 100 : 0
    };

    // Group by date for chart data
    const chartData = [];
    const currentByDate = new Map();
    const previousByDate = new Map();

    // Group current data by date
    currentData.forEach(op => {
      const dateKey = op.dateTime.toISOString().split('T')[0];
      if (!currentByDate.has(dateKey)) {
        currentByDate.set(dateKey, { liters: 0, kg: 0, revenue: 0, operations: 0 });
      }
      const existing = currentByDate.get(dateKey);
      existing.liters += Number(op.quantity_liters || 0);
      existing.kg += Number(op.quantity_kg || 0);
      existing.revenue += calculateRevenueInBAM(op);
      existing.operations += 1;
    });

    // Group previous data by date
    previousData.forEach(op => {
      const dateKey = op.dateTime.toISOString().split('T')[0];
      if (!previousByDate.has(dateKey)) {
        previousByDate.set(dateKey, { liters: 0, kg: 0, revenue: 0, operations: 0 });
      }
      const existing = previousByDate.get(dateKey);
      existing.liters += Number(op.quantity_liters || 0);
      existing.kg += Number(op.quantity_kg || 0);
      existing.revenue += calculateRevenueInBAM(op);
      existing.operations += 1;
    });

    // Create chart data points
    const allDates = new Set([...currentByDate.keys(), ...previousByDate.keys()]);
    for (const date of Array.from(allDates).sort()) {
      const current = currentByDate.get(date) || { liters: 0, kg: 0, revenue: 0, operations: 0 };
      const previous = previousByDate.get(date) || { liters: 0, kg: 0, revenue: 0, operations: 0 };
      
      chartData.push({
        period: date,
        current: current.liters,
        previous: previous.liters,
        growth: previous.liters > 0 ? ((current.liters - previous.liters) / previous.liters) * 100 : 0
      });
    }

    // Get entity names for response
    const entityInfo = {
      airline: currentData[0]?.airline || null,
      destination: currentData[0] ? {
        name: currentData[0].destination,
        code: currentData[0].destination.substring(0, 3).toUpperCase(),
        country: 'N/A'
      } : null
    };

    res.json({
      success: true,
      data: {
        summary: {
          totalCurrent: currentTotals.liters,
          totalPrevious: previousTotals.liters,
          growth: growth.liters,
          operationsCount: currentTotals.operations
        },
        detailed: {
          current: currentTotals,
          previous: previousTotals,
          growth
        },
        chartData,
        entityInfo
      },
      metadata: {
        generatedAt: new Date(),
        currentPeriod,
        previousPeriod,
        filters: {
          airlineId: airlineId || null,
          destinationId: destinationId || null
        }
      }
    });
  } catch (error) {
    console.error('Error generating airline-destination comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate airline-destination comparison',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Helper funkcije za ISO week standard
 */
function getStartOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Sunday = 7
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getISOWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const jan4 = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
  return 1 + Math.ceil(dayDiff / 7);
}

/**
 * POST /api/analytics/comparison/weekly-filtered
 * Sedmična analiza sa filterima za aviokompaniju i destinaciju
 */
export async function getWeeklyFilteredAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { 
      startDate, 
      endDate, 
      airlineId,
      destinationId 
    } = req.body;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required date range'
      });
      return;
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Build filter conditions
    let whereClause: any = {
      is_deleted: false,
      dateTime: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (airlineId) {
      whereClause.airlineId = parseInt(airlineId);
    }

    if (destinationId) {
      whereClause.destination = destinationId;
    }

    // Get all operations in the date range
    const operations = await prisma.fuelingOperation.findMany({
      where: whereClause,
      include: {
        airline: {
          select: { name: true }
        }
      },
      orderBy: {
        dateTime: 'asc'
      }
    });

    await prisma.$disconnect();

    // Group by ISO week
    const weeklyData = new Map();
    
    operations.forEach(op => {
      const date = new Date(op.dateTime);
      const year = date.getFullYear();
      const weekNumber = getISOWeekNumber(date);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      
      if (!weeklyData.has(weekKey)) {
        const weekStart = getStartOfISOWeek(year, weekNumber);
        weeklyData.set(weekKey, {
          week: weekKey,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          liters: 0,
          kg: 0,
          revenue: 0,
          operations: 0
        });
      }
      
      const existing = weeklyData.get(weekKey);
      existing.liters += Number(op.quantity_liters || 0);
      existing.kg += Number(op.quantity_kg || 0);
      existing.revenue += calculateRevenueInBAM(op);
      existing.operations += 1;
    });

    // Convert to array and sort by week
    const weeklyArray = Array.from(weeklyData.values()).sort((a, b) => a.week.localeCompare(b.week));

    // Calculate week-over-week growth
    const weeklyWithGrowth = weeklyArray.map((current, index) => {
      const previous = index > 0 ? weeklyArray[index - 1] : null;
      
      return {
        ...current,
        growth: {
          liters: previous && previous.liters > 0 ? ((current.liters - previous.liters) / previous.liters) * 100 : 0,
          kg: previous && previous.kg > 0 ? ((current.kg - previous.kg) / previous.kg) * 100 : 0,
          revenue: previous && previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
          operations: previous && previous.operations > 0 ? ((current.operations - previous.operations) / previous.operations) * 100 : 0
        }
      };
    });

    // Calculate summary statistics
    const totalLiters = weeklyArray.reduce((sum, week) => sum + week.liters, 0);
    const totalRevenue = weeklyArray.reduce((sum, week) => sum + week.revenue, 0);
    const totalOperations = weeklyArray.reduce((sum, week) => sum + week.operations, 0);
    const avgWeeklyLiters = weeklyArray.length > 0 ? totalLiters / weeklyArray.length : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalWeeks: weeklyArray.length,
          totalLiters,
          totalRevenue,
          totalOperations,
          avgWeeklyLiters
        },
        weeklyData: weeklyWithGrowth,
        filters: {
          airlineId: airlineId || null,
          destinationId: destinationId || null,
          startDate,
          endDate
        }
      },
      metadata: {
        generatedAt: new Date(),
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error generating weekly filtered analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly filtered analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/analytics/comparison/custom-filtered
 * Prilagođena analiza sa filterima za aviokompaniju i destinaciju
 */
export async function getCustomFilteredAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, airlineId, destinationId, comparisonPeriod } = req.body;

    if (!startDate || !endDate) {
      res.status(400).json({ 
        success: false,
        error: 'Start date and end date are required' 
      });
      return;
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate comparison period dates
    const periodDiff = end.getTime() - start.getTime();
    const comparisonStart = new Date(start.getTime() - periodDiff);
    const comparisonEnd = new Date(start.getTime() - 1);

    // Build where clause
    const whereClause: any = {
      is_deleted: false,
      dateTime: {
        gte: start,
        lte: end
      }
    };

    const comparisonWhereClause: any = {
      is_deleted: false,
      dateTime: {
        gte: comparisonStart,
        lte: comparisonEnd
      }
    };

    if (airlineId) {
      whereClause.airlineId = airlineId;
      comparisonWhereClause.airlineId = airlineId;
    }

    if (destinationId) {
      whereClause.destination = destinationId;
      comparisonWhereClause.destination = destinationId;
    }

    // Fetch current period data
    const currentOperations = await prisma.fuelingOperation.findMany({
      where: whereClause,
      include: {
        airline: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        dateTime: 'asc'
      }
    });

    // Fetch comparison period data
    const comparisonOperations = await prisma.fuelingOperation.findMany({
      where: comparisonWhereClause,
      include: {
        airline: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Calculate totals with BAM conversion
    const currentTotals = currentOperations.reduce((acc: any, op: any) => ({
      liters: acc.liters + Number(op.quantity_liters || 0),
      kg: acc.kg + Number(op.quantity_kg || 0),
      revenue: acc.revenue + calculateRevenueInBAM(op),
      operations: acc.operations + 1
    }), { liters: 0, kg: 0, revenue: 0, operations: 0 });

    const comparisonTotals = comparisonOperations.reduce((acc: any, op: any) => ({
      liters: acc.liters + Number(op.quantity_liters || 0),
      kg: acc.kg + Number(op.quantity_kg || 0),
      revenue: acc.revenue + calculateRevenueInBAM(op),
      operations: acc.operations + 1
    }), { liters: 0, kg: 0, revenue: 0, operations: 0 });

    // Calculate growth rates
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Group by date for chart data
    const dailyData = currentOperations.reduce((acc: any, op: any) => {
      const date = op.dateTime.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, liters: 0, kg: 0, revenue: 0, operations: 0 };
      }
      acc[date].liters += Number(op.quantity_liters || 0);
      acc[date].kg += Number(op.quantity_kg || 0);
      acc[date].revenue += calculateRevenueInBAM(op);
      acc[date].operations += 1;
      return acc;
    }, {});

    // Group by airline for breakdown
    const airlineBreakdown = currentOperations.reduce((acc: any, op: any) => {
      const airlineName = op.airline?.name || 'Unknown';
      if (!acc[airlineName]) {
        acc[airlineName] = { name: airlineName, liters: 0, kg: 0, revenue: 0, operations: 0 };
      }
      acc[airlineName].liters += Number(op.quantity_liters || 0);
      acc[airlineName].kg += Number(op.quantity_kg || 0);
      acc[airlineName].revenue += calculateRevenueInBAM(op);
      acc[airlineName].operations += 1;
      return acc;
    }, {});

    // Group by destination for breakdown
    const destinationBreakdown = currentOperations.reduce((acc: any, op: any) => {
      const dest = op.destination || 'Unknown';
      if (!acc[dest]) {
        acc[dest] = { name: dest, liters: 0, kg: 0, revenue: 0, operations: 0 };
      }
      acc[dest].liters += Number(op.quantity_liters || 0);
      acc[dest].kg += Number(op.quantity_kg || 0);
      acc[dest].revenue += calculateRevenueInBAM(op);
      acc[dest].operations += 1;
      return acc;
    }, {});

    const response = {
      summary: {
        currentPeriod: {
          startDate: startDate,
          endDate: endDate,
          ...currentTotals
        },
        comparisonPeriod: {
          startDate: comparisonStart.toISOString().split('T')[0],
          endDate: comparisonEnd.toISOString().split('T')[0],
          ...comparisonTotals
        },
        growth: {
          liters: calculateGrowth(currentTotals.liters, comparisonTotals.liters),
          kg: calculateGrowth(currentTotals.kg, comparisonTotals.kg),
          revenue: calculateGrowth(currentTotals.revenue, comparisonTotals.revenue),
          operations: calculateGrowth(currentTotals.operations, comparisonTotals.operations)
        }
      },
      chartData: Object.values(dailyData),
      breakdown: {
        airlines: Object.values(airlineBreakdown).sort((a: any, b: any) => b.liters - a.liters),
        destinations: Object.values(destinationBreakdown).sort((a: any, b: any) => b.liters - a.liters)
      },
      filters: {
        airlineId,
        destinationId,
        airlineName: airlineId ? currentOperations[0]?.airline?.name : null,
        destinationName: destinationId
      }
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error in getCustomFilteredAnalysis:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

/**
 * POST /api/analytics/comparison/monthly-filtered
 * Mjesečna analiza sa filterima za aviokompaniju i destinaciju
 */
export async function getMonthlyFilteredAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { 
      startDate, 
      endDate, 
      airlineId,
      destinationId 
    } = req.body;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required date range'
      });
      return;
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Build filter conditions
    let whereClause: any = {
      is_deleted: false,
      dateTime: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (airlineId) {
      whereClause.airlineId = parseInt(airlineId);
    }

    if (destinationId) {
      whereClause.destination = destinationId;
    }

    // Get all operations in the date range
    const operations = await prisma.fuelingOperation.findMany({
      where: whereClause,
      include: {
        airline: {
          select: { name: true }
        }
      },
      orderBy: {
        dateTime: 'asc'
      }
    });

    await prisma.$disconnect();

    // Group by month
    const monthlyData = new Map();
    
    operations.forEach(op => {
      const date = new Date(op.dateTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          monthName: date.toLocaleDateString('bs-BA', { year: 'numeric', month: 'long' }),
          liters: 0,
          kg: 0,
          revenue: 0,
          operations: 0
        });
      }
      
      const existing = monthlyData.get(monthKey);
      existing.liters += Number(op.quantity_liters || 0);
      existing.kg += Number(op.quantity_kg || 0);
      existing.revenue += calculateRevenueInBAM(op);
      existing.operations += 1;
    });

    // Convert to array and sort by month
    const monthlyArray = Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Calculate month-over-month growth
    const monthlyWithGrowth = monthlyArray.map((current, index) => {
      const previous = index > 0 ? monthlyArray[index - 1] : null;
      
      return {
        ...current,
        growth: {
          liters: previous && previous.liters > 0 ? ((current.liters - previous.liters) / previous.liters) * 100 : 0,
          kg: previous && previous.kg > 0 ? ((current.kg - previous.kg) / previous.kg) * 100 : 0,
          revenue: previous && previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
          operations: previous && previous.operations > 0 ? ((current.operations - previous.operations) / previous.operations) * 100 : 0
        }
      };
    });

    // Calculate summary statistics
    const totalLiters = monthlyArray.reduce((sum, month) => sum + month.liters, 0);
    const totalRevenue = monthlyArray.reduce((sum, month) => sum + month.revenue, 0);
    const totalOperations = monthlyArray.reduce((sum, month) => sum + month.operations, 0);
    const avgMonthlyLiters = monthlyArray.length > 0 ? totalLiters / monthlyArray.length : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalMonths: monthlyArray.length,
          totalLiters,
          totalRevenue,
          totalOperations,
          avgMonthlyLiters
        },
        monthlyData: monthlyWithGrowth,
        filters: {
          airlineId: airlineId || null,
          destinationId: destinationId || null,
          startDate,
          endDate
        }
      },
      metadata: {
        generatedAt: new Date(),
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error generating monthly filtered analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly filtered analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/analytics/comparison/cached
 */
export async function getCachedAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const cachedData = await generateCachedAnalytics();
    
    res.json({
      success: true,
      data: cachedData,
      metadata: {
        generatedAt: new Date(),
        cacheType: 'dashboard_summary'
      }
    });
  } catch (error) {
    console.error('Error generating cached analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate cached analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Komparacija dva proizvoljna perioda
 */
export const getPeriodComparison = async (
  period1: { startDate: string; endDate: string; name: string },
  period2: { startDate: string; endDate: string; name: string },
  airlineId?: number,
  destinationId?: string
) => {
  try {
    // Validacija datuma
    const start1 = new Date(period1.startDate);
    const end1 = new Date(period1.endDate);
    const start2 = new Date(period2.startDate);
    const end2 = new Date(period2.endDate);
    
    if (start1 >= end1 || start2 >= end2) {
      throw new Error('Početni datum mora biti prije završnog datuma');
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Build filter conditions for period 1
    let whereClause1: any = {
      is_deleted: false,
      dateTime: {
        gte: start1,
        lte: end1
      }
    };

    // Build filter conditions for period 2
    let whereClause2: any = {
      is_deleted: false,
      dateTime: {
        gte: start2,
        lte: end2
      }
    };

    if (airlineId) {
      whereClause1.airlineId = parseInt(airlineId.toString());
      whereClause2.airlineId = parseInt(airlineId.toString());
    }

    if (destinationId) {
      whereClause1.destination = destinationId;
      whereClause2.destination = destinationId;
    }

    // Get operations for both periods
    const [operations1, operations2] = await Promise.all([
      prisma.fuelingOperation.findMany({
        where: whereClause1,
        include: {
          airline: {
            select: { name: true }
          }
        },
        orderBy: {
          dateTime: 'asc'
        }
      }),
      prisma.fuelingOperation.findMany({
        where: whereClause2,
        include: {
          airline: {
            select: { name: true }
          }
        },
        orderBy: {
          dateTime: 'asc'
        }
      })
    ]);

    await prisma.$disconnect();

    // Group by week for both periods
    const groupByWeek = (operations: any[]) => {
      const weeklyData = new Map();
      
      operations.forEach(op => {
        const date = new Date(op.dateTime);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Monday as start of week
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const weekKey = startOfWeek.toISOString().split('T')[0];
        
        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            week: `Sedmica ${Math.ceil(date.getDate() / 7)}`,
            weekStart: startOfWeek.toISOString().split('T')[0],
            weekEnd: endOfWeek.toISOString().split('T')[0],
            liters: 0,
            kg: 0,
            revenue: 0,
            operations: 0
          });
        }
        
        const existing = weeklyData.get(weekKey);
        existing.liters += Number(op.quantity_liters || 0);
        existing.kg += Number(op.quantity_kg || 0);
        existing.revenue += calculateRevenueInBAM(op);
        existing.operations += 1;
      });

      return Array.from(weeklyData.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    };

    const weeklyData1 = groupByWeek(operations1);
    const weeklyData2 = groupByWeek(operations2);

    // Calculate summaries
    const calculateSummary = (weeklyData: any[]) => {
      return weeklyData.reduce((acc, week) => ({
        totalWeeks: acc.totalWeeks + 1,
        totalLiters: acc.totalLiters + week.liters,
        totalRevenue: acc.totalRevenue + week.revenue,
        totalOperations: acc.totalOperations + week.operations,
        avgWeeklyLiters: 0 // Will calculate after
      }), { totalWeeks: 0, totalLiters: 0, totalRevenue: 0, totalOperations: 0, avgWeeklyLiters: 0 });
    };

    const summary1 = calculateSummary(weeklyData1);
    const summary2 = calculateSummary(weeklyData2);

    // Calculate averages
    summary1.avgWeeklyLiters = summary1.totalWeeks > 0 ? summary1.totalLiters / summary1.totalWeeks : 0;
    summary2.avgWeeklyLiters = summary2.totalWeeks > 0 ? summary2.totalLiters / summary2.totalWeeks : 0;

    // Calculate growth between periods
    const comparison = {
      litersGrowth: summary1.totalLiters > 0 ? ((summary2.totalLiters - summary1.totalLiters) / summary1.totalLiters) * 100 : 0,
      revenueGrowth: summary1.totalRevenue > 0 ? ((summary2.totalRevenue - summary1.totalRevenue) / summary1.totalRevenue) * 100 : 0,
      operationsGrowth: summary1.totalOperations > 0 ? ((summary2.totalOperations - summary1.totalOperations) / summary1.totalOperations) * 100 : 0,
      avgWeeklyGrowth: summary1.avgWeeklyLiters > 0 ? ((summary2.avgWeeklyLiters - summary1.avgWeeklyLiters) / summary1.avgWeeklyLiters) * 100 : 0
    };

    const result = {
      period1: {
        name: period1.name,
        startDate: period1.startDate,
        endDate: period1.endDate,
        summary: summary1,
        weeklyData: weeklyData1
      },
      period2: {
        name: period2.name,
        startDate: period2.startDate,
        endDate: period2.endDate,
        summary: summary2,
        weeklyData: weeklyData2
      },
      comparison,
      filters: {
        airlineId: airlineId || null,
        destinationId: destinationId || null
      }
    };
    
    return result;
    
  } catch (error) {
    console.error('Error in getPeriodComparison:', error);
    throw error;
  }
};