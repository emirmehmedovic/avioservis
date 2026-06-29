import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import {
  getCustomFilteredAnalysis,
  getMonthlyFilteredAnalysis,
  getWeeklyFilteredAnalysis,
  getPeriodComparison
} from './analyticsComparison.controller';
import { prisma } from '../lib/prisma';

// Template tipovi
export enum ReportTemplate {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  COMPARISON = 'comparison'
}

// Automatsko određivanje template-a
function determineTemplate(period1Start: Date, period1End: Date, period2Start?: Date): ReportTemplate {
  if (period2Start) return ReportTemplate.COMPARISON;
  
  const daysDiff = Math.ceil((period1End.getTime() - period1Start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) return ReportTemplate.DAILY;
  if (daysDiff <= 7) return ReportTemplate.WEEKLY;
  return ReportTemplate.MONTHLY;
}

// Generiranje naslova izvještaja
function generateReportTitle(template: ReportTemplate, period1Start: Date, period1End: Date, period2Start?: Date): string {
  const formatDate = (date: Date) => date.toLocaleDateString('bs-BA');
  
  switch (template) {
    case ReportTemplate.DAILY:
      return `Dnevni izvještaj - ${formatDate(period1Start)}`;
    case ReportTemplate.WEEKLY:
      return `Sedmični izvještaj - ${formatDate(period1Start)} do ${formatDate(period1End)}`;
    case ReportTemplate.MONTHLY:
      return `Mjesečni izvještaj - ${formatDate(period1Start)} do ${formatDate(period1End)}`;
    case ReportTemplate.COMPARISON:
      return `Komparativni izvještaj - ${formatDate(period1Start)} vs ${formatDate(period2Start!)}`;
    default:
      return 'Analitički izvještaj';
  }
}

// POST /api/reports/generate - Generiši izvještaj
export const generateReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      period1_start, 
      period1_end, 
      period2_start, 
      period2_end,
      airlineId,
      destinationId 
    } = req.body;

    if (!period1_start || !period1_end) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'period1_start and period1_end are required'
      });
      return;
    }

    const period1Start = new Date(period1_start + 'T00:00:00.000Z');
    const period1End = new Date(period1_end + 'T23:59:59.999Z');
    const period2Start = period2_start ? new Date(period2_start + 'T00:00:00.000Z') : undefined;
    const period2End = period2_end ? new Date(period2_end + 'T23:59:59.999Z') : undefined;

    // Odredi template
    const template = determineTemplate(period1Start, period1End, period2Start);
    
    // Generiraj naslov
    const title = generateReportTitle(template, period1Start, period1End, period2Start);

    // Generiraj access token
    const accessToken = uuidv4();

    // Kreiraj izvještaj u bazi
    const report = await prisma.report.create({
      data: {
        title,
        template,
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End,
        generated_by: req.user!.id,
        access_token: accessToken,
        is_public: false
      }
    });

    res.status(201).json({
      success: true,
      data: {
        reportId: report.id,
        accessToken: report.access_token,
        title: report.title,
        template: report.template,
        url: `/reports/${report.access_token}`
      },
      metadata: {
        generatedAt: new Date(),
        generatedBy: req.user!.username
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/reports/{token} - Dohvati izvještaj
export const getReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;

    // Pronađi izvještaj
    const report = await prisma.report.findUnique({
      where: { access_token: token },
      include: {
        generated_by_user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
        details: 'The requested report does not exist or has been deleted'
      });
      return;
    }

    // Zabilježi pristup
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    await prisma.reportAccess.create({
      data: {
        report_id: report.id,
        user_id: req.user?.id || null,
        ip_address: clientIp
      }
    });

    // Generiraj podatke na osnovu template-a
    let reportData: any = {};

    switch (report.template) {
      case ReportTemplate.DAILY:
        reportData = await generateDailyReportData(report);
        break;
      case ReportTemplate.WEEKLY:
        reportData = await generateWeeklyReportData(report);
        break;
      case ReportTemplate.MONTHLY:
        reportData = await generateMonthlyReportData(report);
        break;
      case ReportTemplate.COMPARISON:
        reportData = await generateComparisonReportData(report);
        break;
      default:
        throw new Error('Invalid report template');
    }

    res.json({
      success: true,
      data: {
        report,
        reportData
      },
      metadata: {
        accessedAt: new Date(),
        accessedBy: req.user?.username || 'Anonymous'
      }
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/reports/my - Moji izvještaji
export const getMyReports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      where: { generated_by: req.user!.id },
      orderBy: { generated_at: 'desc' },
      select: {
        id: true,
        title: true,
        template: true,
        period1_start: true,
        period1_end: true,
        period2_start: true,
        period2_end: true,
        generated_at: true,
        access_token: true,
        _count: {
          select: {
            accesses: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: reports,
      metadata: {
        totalReports: reports.length,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching my reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// DELETE /api/reports/{id} - Obriši izvještaj
export const deleteReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Provjeri da li korisnik može obrisati izvještaj
    const report = await prisma.report.findFirst({
      where: {
        id: parseInt(id),
        generated_by: req.user!.id
      }
    });

    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
        details: 'Report not found or you do not have permission to delete it'
      });
      return;
    }

    await prisma.report.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper funkcije za generiranje podataka
async function generateDailyReportData(report: any) {
  const startDate = report.period1_start;
  const endDate = report.period1_end;
  
  // Dohvati podatke za taj dan (bez obrisanih)
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: startDate,
        lte: endDate
      },
      is_deleted: false
    },
    include: {
      airline: true,
      aircraft: true
    }
  });

  // Izračunaj statistike sa konverzijom valuta
  const totalLiters = operations.reduce((sum, op) => sum + Number(op.quantity_liters), 0);
  const totalKg = operations.reduce((sum, op) => sum + Number(op.quantity_kg), 0);
  
  // Konverzija valuta u BAM
  const totalRevenue = operations.reduce((sum, op) => {
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate); // USD → BAM preko kursa
    }
    return sum + amount;
  }, 0);
  
  const totalOperations = operations.length;

  // Grupiranje po aviokompaniji
  const airlineStats = operations.reduce((acc, op) => {
    const airline = op.airline.name;
    if (!acc[airline]) {
      acc[airline] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
    }
    acc[airline].liters += Number(op.quantity_liters);
    acc[airline].kg += Number(op.quantity_kg);
    
    // Konverzija valuta za aviokompaniju
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate); // USD → BAM preko kursa
    }
    acc[airline].revenue += amount;
    acc[airline].operations += 1;
    return acc;
  }, {} as any);

  // Grupiranje po destinaciji
  const destinationStats = operations.reduce((acc, op) => {
    const destination = op.destination;
    if (!acc[destination]) {
      acc[destination] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
    }
    acc[destination].liters += Number(op.quantity_liters);
    acc[destination].kg += Number(op.quantity_kg);
    
    // Konverzija valuta za destinaciju
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate); // USD → BAM preko kursa
    }
    acc[destination].revenue += amount;
    acc[destination].operations += 1;
    return acc;
  }, {} as any);

  // Dohvati informacije o rasporedu za taj dan
  const scheduledFlights = await prisma.flightSchedule.findMany({
    where: {
      scheduled_date: {
        gte: startDate,
        lte: endDate
      },
      is_deleted: false
    },
    include: {
      airline: true
    }
  });

  const expectedOperations = scheduledFlights.reduce((sum, flight) => sum + flight.expected_operations, 0);
  
  // Broj realizovanih operacija koristeći smart matching logiku
  const matchedOperations = new Set();
  scheduledFlights.forEach(flight => {
    const matching = operations.filter(op => {
      if (matchedOperations.has(op.id)) return false;

      const scheduleDestination = flight.destination.toLowerCase();
      const opDestination = op.destination.toLowerCase();
      const destinationMatch = 
        scheduleDestination.includes(opDestination) || 
        opDestination.includes(scheduleDestination);
      
      if (!destinationMatch) return false;

      const scheduleAirlineName = flight.airline.name.toLowerCase();
      const opAirlineName = op.airline.name.toLowerCase();
      
      const airlineMatch = 
        scheduleAirlineName.includes(opAirlineName) || 
        opAirlineName.includes(scheduleAirlineName) ||
        op.airlineId === flight.airlineId;
      
      return airlineMatch;
    });

    matching.forEach(op => matchedOperations.add(op.id));
  });
  
  const realizedOperations = matchedOperations.size;
  const scheduleRealizationRate = expectedOperations > 0 ? (realizedOperations / expectedOperations) * 100 : 0;

  return {
    summary: {
      totalLiters,
      totalKg,
      totalRevenue,
      totalOperations,
      averageLitersPerOperation: totalOperations > 0 ? totalLiters / totalOperations : 0,
      expectedOperations,
      realizedOperations,
      scheduleRealizationRate
    },
    charts: {
      airlineBreakdown: Object.entries(airlineStats).map(([name, stats]: [string, any]) => ({
        name,
        liters: stats.liters,
        kg: stats.kg,
        revenue: stats.revenue,
        operations: stats.operations,
        percentage: {
          liters: (stats.liters / totalLiters) * 100,
          kg: (stats.kg / totalKg) * 100,
          revenue: (stats.revenue / totalRevenue) * 100,
          operations: (stats.operations / totalOperations) * 100
        }
      })).sort((a, b) => b.liters - a.liters)
    },
    tables: {
      operations: operations.map(op => {
        // Konverzija valuta za pojedinačnu operaciju
        let convertedAmount = Number(op.total_amount);
        if (op.currency === 'EUR') {
          convertedAmount = convertedAmount * 1.955830; // Egzaktna konverzija EUR → BAM
        } else if (op.currency === 'USD' && op.usd_exchange_rate) {
          convertedAmount = convertedAmount * Number(op.usd_exchange_rate); // USD → BAM preko kursa
        }
        
        return {
          id: op.id,
          airline: op.airline.name,
          destination: op.destination,
          flightNumber: op.flight_number,
          liters: Number(op.quantity_liters),
          kg: Number(op.quantity_kg),
          revenue: convertedAmount,
          originalAmount: Number(op.total_amount),
          currency: op.currency,
          date: op.dateTime,
          operator: op.operator_name
        };
      })
    },
    schedule: {
      expectedOperations,
      realizedOperations,
      realizationRate: scheduleRealizationRate,
      scheduledFlights: scheduledFlights.map(flight => {
        // Koristi istu smart matching logiku kao u flightSchedule.controller.ts
        const matchingOperations = operations.filter(op => {
          // Smart matching za destinaciju - bidirectional partial match
          const scheduleDestination = flight.destination.toLowerCase();
          const opDestination = op.destination.toLowerCase();
          const destinationMatch = 
            scheduleDestination.includes(opDestination) || 
            opDestination.includes(scheduleDestination);
          
          if (!destinationMatch) return false;

          // Smart matching za aviokompaniju - bidirectional partial match
          const scheduleAirlineName = flight.airline.name.toLowerCase();
          const opAirlineName = op.airline.name.toLowerCase();
          
          const airlineMatch = 
            scheduleAirlineName.includes(opAirlineName) || 
            opAirlineName.includes(scheduleAirlineName) ||
            op.airlineId === flight.airlineId;
          
          return airlineMatch;
        });
        
        return {
          airline: flight.airline.name,
          destination: flight.destination,
          expectedOperations: flight.expected_operations,
          realizedOperations: matchingOperations.length,
          scheduledDate: flight.scheduled_date
        };
      })
    }
  };
}

async function generateWeeklyReportData(report: any) {
  const startDate = report.period1_start;
  const endDate = report.period1_end;
  
  // Dohvati podatke za sedmicu (bez obrisanih)
  const operations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: startDate,
        lte: endDate
      },
      is_deleted: false
    },
    include: {
      airline: true,
      aircraft: true
    }
  });

  // Grupiranje po danima sa konverzijom valuta
  const dailyStats = operations.reduce((acc, op) => {
    const date = op.dateTime.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
    }
    acc[date].liters += Number(op.quantity_liters);
    acc[date].kg += Number(op.quantity_kg);
    
    // Konverzija valuta u BAM
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate); // USD → BAM preko kursa
    }
    acc[date].revenue += amount;
    acc[date].operations += 1;
    return acc;
  }, {} as any);

  // Prethodna sedmica za komparaciju
  const weekStart = new Date(startDate);
  const weekEnd = new Date(endDate);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekEnd);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

  const prevWeekOperations = await prisma.fuelingOperation.findMany({
    where: {
      dateTime: {
        gte: prevWeekStart,
        lte: prevWeekEnd
      },
      is_deleted: false
    },
    include: {
      airline: true,
      aircraft: true
    }
  });

  // Grupiranje prethodne sedmice po danima sa konverzijom valuta
  const prevWeekDailyStats = prevWeekOperations.reduce((acc, op) => {
    const date = op.dateTime.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
    }
    acc[date].liters += Number(op.quantity_liters);
    acc[date].kg += Number(op.quantity_kg);
    
    // Konverzija valuta u BAM
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate);
    }
    acc[date].revenue += amount;
    acc[date].operations += 1;
    return acc;
  }, {} as any);

  const currentWeekTotal = operations.reduce((sum, op) => sum + Number(op.quantity_liters), 0);
  const prevWeekTotal = prevWeekOperations.reduce((sum, op) => sum + Number(op.quantity_liters), 0);
  const growth = prevWeekTotal > 0 ? ((currentWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  // Izračunaj ukupne statistike sa konverzijom valuta
  const totalLiters = operations.reduce((sum, op) => sum + Number(op.quantity_liters), 0);
  const totalKg = operations.reduce((sum, op) => sum + Number(op.quantity_kg), 0);
    const totalRevenue = operations.reduce((sum, op) => {
      let amount = Number(op.total_amount);
      if (op.currency === 'EUR') {
        amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
      } else if (op.currency === 'USD' && op.usd_exchange_rate) {
        amount = amount * Number(op.usd_exchange_rate); // USD → BAM preko kursa
      }
      return sum + amount;
    }, 0);

  // Grupiranje po aviokompaniji sa konverzijom valuta
  const airlineStats = operations.reduce((acc, op) => {
    const airline = op.airline.name;
    if (!acc[airline]) {
      acc[airline] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
    }
    acc[airline].liters += Number(op.quantity_liters);
    acc[airline].kg += Number(op.quantity_kg);
    
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate);
    }
    acc[airline].revenue += amount;
    acc[airline].operations += 1;
    return acc;
  }, {} as any);

  // Dohvati informacije o rasporedu za sedmicu
  const scheduledFlights = await prisma.flightSchedule.findMany({
    where: {
      scheduled_date: {
        gte: startDate,
        lte: endDate
      },
      is_deleted: false
    },
    include: {
      airline: true
    }
  });

  // Grupiranje planiranih operacija po danima
  const plannedOperationsByDay = scheduledFlights.reduce((acc, flight) => {
    const date = flight.scheduled_date.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { expectedOperations: 0, flights: [] };
    }
    acc[date].expectedOperations += flight.expected_operations;
    acc[date].flights.push({
      airline: flight.airline.name,
      destination: flight.destination,
      expectedOperations: flight.expected_operations,
      scheduledDate: flight.scheduled_date
    });
    return acc;
  }, {} as any);

  // Grupiranje realizovanih operacija po danima sa smart matching
  const realizedOperationsByDay = operations.reduce((acc, op) => {
    const date = op.dateTime.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { realizedOperations: 0, operations: [] };
    }
    acc[date].realizedOperations += 1;
    acc[date].operations.push(op);
    return acc;
  }, {} as any);

  // Izračunaj realizaciju po danima
  const scheduleComparison = Object.keys(plannedOperationsByDay).map(date => {
    const planned = plannedOperationsByDay[date];
    const realized = realizedOperationsByDay[date] || { realizedOperations: 0, operations: [] };
    
    // Smart matching za realizovane operacije
    const matchedOperations = new Set();
    planned.flights.forEach((flight: any) => {
      const matching = realized.operations.filter((op: any) => {
        if (matchedOperations.has(op.id)) return false;

        const scheduleDestination = flight.destination.toLowerCase();
        const opDestination = op.destination.toLowerCase();
        const destinationMatch = 
          scheduleDestination.includes(opDestination) || 
          opDestination.includes(scheduleDestination);
        
        if (!destinationMatch) return false;

        const scheduleAirlineName = flight.airline.toLowerCase();
        const opAirlineName = op.airline.name.toLowerCase();
        
        const airlineMatch = 
          scheduleAirlineName.includes(opAirlineName) || 
          opAirlineName.includes(scheduleAirlineName);
        
        return airlineMatch;
      });

      matching.forEach((op: any) => matchedOperations.add(op.id));
    });

    return {
      date,
      expectedOperations: planned.expectedOperations,
      realizedOperations: matchedOperations.size,
      realizationRate: planned.expectedOperations > 0 ? (matchedOperations.size / planned.expectedOperations) * 100 : 0,
      flights: planned.flights.map((flight: any) => {
        const matchingOps = realized.operations.filter((op: any) => {
          const scheduleDestination = flight.destination.toLowerCase();
          const opDestination = op.destination.toLowerCase();
          const destinationMatch = 
            scheduleDestination.includes(opDestination) || 
            opDestination.includes(scheduleDestination);
          
          if (!destinationMatch) return false;

          const scheduleAirlineName = flight.airline.toLowerCase();
          const opAirlineName = op.airline.name.toLowerCase();
          
          const airlineMatch = 
            scheduleAirlineName.includes(opAirlineName) || 
            opAirlineName.includes(scheduleAirlineName);
          
          return airlineMatch;
        });

        return {
          airline: flight.airline,
          destination: flight.destination,
          expectedOperations: flight.expectedOperations,
          realizedOperations: matchingOps.length,
          scheduledDate: flight.scheduledDate
        };
      })
    };
  });

  return {
    summary: {
      totalLiters,
      totalKg,
      totalRevenue,
      totalOperations: operations.length,
      weekOverWeekGrowth: growth
    },
    charts: {
      dailyBreakdown: Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
        date,
        liters: stats.liters,
        kg: stats.kg,
        revenue: stats.revenue,
        operations: stats.operations
      })),
      previousWeekDaily: Object.entries(prevWeekDailyStats).map(([date, stats]: [string, any]) => ({
        date,
        liters: stats.liters,
        kg: stats.kg,
        revenue: stats.revenue,
        operations: stats.operations
      }))
    },
    comparisons: {
      previousWeek: {
        liters: prevWeekTotal,
        growth: growth
      }
    },
    airlineStats: Object.entries(airlineStats).map(([airline, stats]: [string, any]) => ({
      airline,
      liters: stats.liters,
      kg: stats.kg,
      revenue: stats.revenue,
      operations: stats.operations,
      percentage: {
        liters: (stats.liters / totalLiters) * 100,
        kg: (stats.kg / totalKg) * 100,
        revenue: (stats.revenue / totalRevenue) * 100,
        operations: (stats.operations / operations.length) * 100
      }
    })).sort((a, b) => b.liters - a.liters),
    scheduleComparison
  };
}

async function generateMonthlyReportData(report: any) {
  const startDate = report.period1_start;
  const endDate = report.period1_end;

  // Izračunaj prethodni mjesec
  const currentMonth = new Date(startDate);
  const previousMonth = new Date(currentMonth);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  
  const previousMonthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
  const previousMonthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  // Dohvati operacije za trenutni i prethodni mjesec (bez obrisanih)
  const [currentOperations, previousOperations] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate },
        is_deleted: false
      },
      include: { 
        airline: true,
        aircraft: true
      }
    }),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: previousMonthStart, lte: previousMonthEnd },
        is_deleted: false
      },
      include: { 
        airline: true,
        aircraft: true
      }
    })
  ]);

  // Funkcija za izračun statistika sa konverzijom valuta
  const calculateStats = (operations: any[]) => {
    const totalLiters = operations.reduce((sum, op) => sum + Number(op.quantity_liters), 0);
    const totalKg = operations.reduce((sum, op) => sum + Number(op.quantity_kg), 0);
    
    const totalRevenue = operations.reduce((sum, op) => {
      let amount = Number(op.total_amount);
      if (op.currency === 'EUR') {
        amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
      } else if (op.currency === 'USD' && op.usd_exchange_rate) {
        amount = amount * Number(op.usd_exchange_rate); // USD → BAM preko kursa
      }
      return sum + amount;
    }, 0);

    return {
      totalLiters,
      totalKg,
      totalRevenue,
      totalOperations: operations.length
    };
  };

  const currentStats = calculateStats(currentOperations);
  const previousStats = calculateStats(previousOperations);

  // Izračunaj growth
  const calculateGrowth = (current: number, previous: number) => 
    previous > 0 ? ((current - previous) / previous) * 100 : 0;

  const growth = {
    liters: calculateGrowth(currentStats.totalLiters, previousStats.totalLiters),
    kg: calculateGrowth(currentStats.totalKg, previousStats.totalKg),
    revenue: calculateGrowth(currentStats.totalRevenue, previousStats.totalRevenue),
    operations: calculateGrowth(currentStats.totalOperations, previousStats.totalOperations)
  };

  // Grupiranje po sedmicama za trenutni mjesec
  const weeklyStats = currentOperations.reduce((acc, op) => {
    const date = new Date(op.dateTime);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = { 
        liters: 0, 
        kg: 0, 
        revenue: 0, 
        operations: 0,
        weekStart: weekStart,
        weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
        dailyStats: {}
      };
    }
    acc[weekKey].liters += Number(op.quantity_liters);
    acc[weekKey].kg += Number(op.quantity_kg);
    
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate);
    }
    acc[weekKey].revenue += amount;
    acc[weekKey].operations += 1;
    
    // Dodaj dnevne statistike
    const dayKey = date.toISOString().split('T')[0];
    if (!acc[weekKey].dailyStats[dayKey]) {
      acc[weekKey].dailyStats[dayKey] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
    }
    acc[weekKey].dailyStats[dayKey].liters += Number(op.quantity_liters);
    acc[weekKey].dailyStats[dayKey].kg += Number(op.quantity_kg);
    acc[weekKey].dailyStats[dayKey].revenue += amount;
    acc[weekKey].dailyStats[dayKey].operations += 1;
    
    return acc;
  }, {} as any);

  // Grupiranje po aviokompaniji sa konverzijom valuta
  const airlineStats = currentOperations.reduce((acc, op) => {
    const airline = op.airline.name;
    if (!acc[airline]) {
      acc[airline] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
    }
    acc[airline].liters += Number(op.quantity_liters);
    acc[airline].kg += Number(op.quantity_kg);
    
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate);
    }
    acc[airline].revenue += amount;
    acc[airline].operations += 1;
    return acc;
  }, {} as any);

  // Grupiranje po sedmicama za prošli mjesec
  const previousMonthWeeklyStats = previousOperations.reduce((acc, op) => {
    const date = new Date(op.dateTime);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = { 
        liters: 0, 
        kg: 0, 
        revenue: 0, 
        operations: 0,
        weekStart: weekStart,
        weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
      };
    }
    acc[weekKey].liters += Number(op.quantity_liters);
    acc[weekKey].kg += Number(op.quantity_kg);
    
    let amount = Number(op.total_amount);
    if (op.currency === 'EUR') {
      amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
    } else if (op.currency === 'USD' && op.usd_exchange_rate) {
      amount = amount * Number(op.usd_exchange_rate);
    }
    acc[weekKey].revenue += amount;
    acc[weekKey].operations += 1;
    
    return acc;
  }, {} as any);

  // Dohvati informacije o rasporedu za mjesec
  const scheduledFlights = await prisma.flightSchedule.findMany({
    where: {
      scheduled_date: {
        gte: startDate,
        lte: endDate
      },
      is_deleted: false
    },
    include: {
      airline: true
    }
  });

  // Grupiranje planiranih operacija po danima
  const plannedOperationsByDay = scheduledFlights.reduce((acc, flight) => {
    const date = flight.scheduled_date.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { expectedOperations: 0, flights: [] };
    }
    acc[date].expectedOperations += flight.expected_operations;
    acc[date].flights.push({
      airline: flight.airline.name,
      destination: flight.destination,
      expectedOperations: flight.expected_operations,
      scheduledDate: flight.scheduled_date
    });
    return acc;
  }, {} as any);

  // Grupiranje realizovanih operacija po danima sa smart matching
  const realizedOperationsByDay = currentOperations.reduce((acc, op) => {
    const date = op.dateTime.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { realizedOperations: 0, operations: [] };
    }
    acc[date].realizedOperations += 1;
    acc[date].operations.push(op);
    return acc;
  }, {} as any);

  // Izračunaj realizaciju po danima
  const scheduleComparison = Object.keys(plannedOperationsByDay).map(date => {
    const planned = plannedOperationsByDay[date];
    const realized = realizedOperationsByDay[date] || { realizedOperations: 0, operations: [] };
    
    // Smart matching za realizovane operacije
    const matchedOperations = new Set();
    planned.flights.forEach((flight: any) => {
      const matching = realized.operations.filter((op: any) => {
        if (matchedOperations.has(op.id)) return false;

        const scheduleDestination = flight.destination.toLowerCase();
        const opDestination = op.destination.toLowerCase();
        const destinationMatch = 
          scheduleDestination.includes(opDestination) || 
          opDestination.includes(scheduleDestination);
        
        if (!destinationMatch) return false;

        const scheduleAirlineName = flight.airline.toLowerCase();
        const opAirlineName = op.airline.name.toLowerCase();
        
        const airlineMatch = 
          scheduleAirlineName.includes(opAirlineName) || 
          opAirlineName.includes(scheduleAirlineName);
        
        return airlineMatch;
      });

      matching.forEach((op: any) => matchedOperations.add(op.id));
    });

    return {
      date,
      expectedOperations: planned.expectedOperations,
      realizedOperations: matchedOperations.size,
      realizationRate: planned.expectedOperations > 0 ? (matchedOperations.size / planned.expectedOperations) * 100 : 0,
      flights: planned.flights.map((flight: any) => {
        const matchingOps = realized.operations.filter((op: any) => {
          const scheduleDestination = flight.destination.toLowerCase();
          const opDestination = op.destination.toLowerCase();
          const destinationMatch = 
            scheduleDestination.includes(opDestination) || 
            opDestination.includes(scheduleDestination);
          
          if (!destinationMatch) return false;

          const scheduleAirlineName = flight.airline.toLowerCase();
          const opAirlineName = op.airline.name.toLowerCase();
          
          const airlineMatch = 
            scheduleAirlineName.includes(opAirlineName) || 
            opAirlineName.includes(scheduleAirlineName);
          
          return airlineMatch;
        });

        return {
          airline: flight.airline,
          destination: flight.destination,
          expectedOperations: flight.expectedOperations,
          realizedOperations: matchingOps.length,
          scheduledDate: flight.scheduledDate
        };
      })
    };
  });

  return {
    summary: {
      current: currentStats,
      previous: previousStats,
      growth
    },
    charts: {
      weeklyBreakdown: Object.entries(weeklyStats).map(([week, stats]: [string, any]) => ({
        week,
        weekStart: stats.weekStart,
        weekEnd: stats.weekEnd,
        liters: stats.liters,
        kg: stats.kg,
        revenue: stats.revenue,
        operations: stats.operations,
        dailyStats: Object.entries(stats.dailyStats).map(([day, dayStats]: [string, any]) => ({
          day,
          liters: dayStats.liters,
          kg: dayStats.kg,
          revenue: dayStats.revenue,
          operations: dayStats.operations
        }))
      })),
      previousMonthWeeklyBreakdown: Object.entries(previousMonthWeeklyStats).map(([week, stats]: [string, any]) => ({
        week,
        weekStart: stats.weekStart,
        weekEnd: stats.weekEnd,
        liters: stats.liters,
        kg: stats.kg,
        revenue: stats.revenue,
        operations: stats.operations
      }))
    },
    airlineStats: Object.entries(airlineStats).map(([airline, stats]: [string, any]) => ({
      airline,
      liters: stats.liters,
      kg: stats.kg,
      revenue: stats.revenue,
      operations: stats.operations,
      percentage: {
        liters: (stats.liters / currentStats.totalLiters) * 100,
        kg: (stats.kg / currentStats.totalKg) * 100,
        revenue: (stats.revenue / currentStats.totalRevenue) * 100,
        operations: (stats.operations / currentStats.totalOperations) * 100
      }
    })).sort((a, b) => b.liters - a.liters),
    scheduleComparison
  };
}

async function generateComparisonReportData(report: any) {
  const period1Start = report.period1_start;
  const period1End = report.period1_end;
  const period2Start = report.period2_start;
  const period2End = report.period2_end;

  // Dohvati podatke za oba perioda (bez obrisanih)
  const [period1Ops, period2Ops] = await Promise.all([
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: period1Start, lte: period1End },
        is_deleted: false
      },
      include: { airline: true }
    }),
    prisma.fuelingOperation.findMany({
      where: {
        dateTime: { gte: period2Start, lte: period2End },
        is_deleted: false
      },
      include: { airline: true }
    })
  ]);

  // Izračunaj statistike sa konverzijom valuta
  const calculateStats = (operations: any[]) => {
    const totalLiters = operations.reduce((sum, op) => sum + Number(op.quantity_liters), 0);
    const totalKg = operations.reduce((sum, op) => sum + Number(op.quantity_kg), 0);
    
    const totalRevenue = operations.reduce((sum, op) => {
      let amount = Number(op.total_amount);
      if (op.currency === 'EUR') {
        amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
      } else if (op.currency === 'USD' && op.usd_exchange_rate) {
        amount = amount * Number(op.usd_exchange_rate);
      }
      return sum + amount;
    }, 0);
    
    return {
      liters: totalLiters,
      kg: totalKg,
      revenue: totalRevenue,
      operations: operations.length
    };
  };

  const period1Stats = calculateStats(period1Ops);
  const period2Stats = calculateStats(period2Ops);

  // Fallback vrijednosti ako nema podataka
  const safePeriod1Stats = {
    liters: period1Stats.liters || 0,
    kg: period1Stats.kg || 0,
    revenue: period1Stats.revenue || 0,
    operations: period1Stats.operations || 0
  };
  
  const safePeriod2Stats = {
    liters: period2Stats.liters || 0,
    kg: period2Stats.kg || 0,
    revenue: period2Stats.revenue || 0,
    operations: period2Stats.operations || 0
  };

  console.log('Debug - period1Stats:', period1Stats);
  console.log('Debug - period2Stats:', period2Stats);
  console.log('Debug - period1Ops count:', period1Ops.length);
  console.log('Debug - period2Ops count:', period2Ops.length);
  console.log('Debug - safePeriod1Stats:', safePeriod1Stats);
  console.log('Debug - safePeriod2Stats:', safePeriod2Stats);

  const calculateGrowth = (current: number, previous: number) => 
    previous > 0 ? ((current - previous) / previous) * 100 : 0;

  const growth = {
    liters: calculateGrowth(safePeriod2Stats.liters, safePeriod1Stats.liters),
    kg: calculateGrowth(safePeriod2Stats.kg, safePeriod1Stats.kg),
    revenue: calculateGrowth(safePeriod2Stats.revenue, safePeriod1Stats.revenue),
    operations: calculateGrowth(safePeriod2Stats.operations, safePeriod1Stats.operations)
  };

  console.log('Debug - growth:', growth);

  // Grupiranje po aviokompaniji za oba perioda
  const getAirlineStats = (operations: any[]) => {
    return operations.reduce((acc, op) => {
      const airline = op.airline.name;
      if (!acc[airline]) {
        acc[airline] = { liters: 0, kg: 0, revenue: 0, operations: 0 };
      }
      acc[airline].liters += Number(op.quantity_liters);
      acc[airline].kg += Number(op.quantity_kg);
      
      let amount = Number(op.total_amount);
      if (op.currency === 'EUR') {
        amount = amount * 1.955830; // Egzaktna konverzija EUR → BAM
      } else if (op.currency === 'USD' && op.usd_exchange_rate) {
        amount = amount * Number(op.usd_exchange_rate);
      }
      acc[airline].revenue += amount;
      acc[airline].operations += 1;
      return acc;
    }, {} as any);
  };

  const period1AirlineStats = getAirlineStats(period1Ops);
  const period2AirlineStats = getAirlineStats(period2Ops);

  return {
    summary: {
      period1: safePeriod1Stats,
      period2: safePeriod2Stats,
      growth
    },
    comparison: {
      period1: {
        label: `Period 1 (${new Date(period1Start).toLocaleDateString('bs-BA')} - ${new Date(period1End).toLocaleDateString('bs-BA')})`,
        ...safePeriod1Stats
      },
      period2: {
        label: `Period 2 (${new Date(period2Start).toLocaleDateString('bs-BA')} - ${new Date(period2End).toLocaleDateString('bs-BA')})`,
        ...safePeriod2Stats
      }
    },
    charts: {
      periodComparison: (() => {
        const chartData = [
          {
            period: 'Litara',
            current: safePeriod2Stats.liters,
            previous: safePeriod1Stats.liters,
            growth: growth.liters
          },
          {
            period: 'Kg',
            current: safePeriod2Stats.kg,
            previous: safePeriod1Stats.kg,
            growth: growth.kg
          },
          {
            period: 'Prihod (BAM)',
            current: safePeriod2Stats.revenue,
            previous: safePeriod1Stats.revenue,
            growth: growth.revenue
          },
          {
            period: 'Operacije',
            current: safePeriod2Stats.operations,
            previous: safePeriod1Stats.operations,
            growth: growth.operations
          }
        ];
        console.log('Debug - periodComparison chart data:', chartData);
        return chartData;
      })(),
      airlineComparison: Object.keys({...period1AirlineStats, ...period2AirlineStats}).map(airline => ({
        period: airline,
        current: period2AirlineStats[airline]?.liters || 0,
        previous: period1AirlineStats[airline]?.liters || 0,
        growth: period1AirlineStats[airline] ? 
          calculateGrowth(period2AirlineStats[airline]?.liters || 0, period1AirlineStats[airline].liters) : 0
      }))
    },
    tables: {
      operations: [
        {
          period: `Period 1 (${new Date(period1Start).toLocaleDateString('bs-BA')} - ${new Date(period1End).toLocaleDateString('bs-BA')})`,
          ...period1Stats
        },
        {
          period: `Period 2 (${new Date(period2Start).toLocaleDateString('bs-BA')} - ${new Date(period2End).toLocaleDateString('bs-BA')})`,
          ...period2Stats
        }
      ]
    },
    trends: {
      period1: period1Stats,
      period2: period2Stats,
      growth
    }
  };
}
