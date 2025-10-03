import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns';

const prisma = new PrismaClient();

// GET /api/flight-schedules - Get all schedules with optional filters
export const getAllSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { airlineId, startDate, endDate, destination } = req.query;
    
    const where: any = {
      is_deleted: false,
    };

    if (airlineId) {
      where.airlineId = parseInt(airlineId as string);
    }

    if (destination) {
      where.destination = {
        contains: destination as string,
        mode: 'insensitive',
      };
    }

    if (startDate && endDate) {
      where.scheduled_date = {
        gte: new Date((startDate as string) + 'T00:00:00.000Z'),
        lte: new Date((endDate as string) + 'T23:59:59.999Z'),
      };
    }

    const schedules = await prisma.flightSchedule.findMany({
      where,
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        scheduled_date: 'asc',
      },
    });

    res.status(200).json(schedules);
  } catch (error) {
    next(error);
  }
};

// GET /api/flight-schedules/:id - Get single schedule by ID
export const getScheduleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const schedule = await prisma.flightSchedule.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: false,
      },
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    res.status(200).json(schedule);
  } catch (error) {
    next(error);
  }
};

// POST /api/flight-schedules - Create new schedule
export const createSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { airlineId, destination, flight_number, scheduled_date, expected_operations, notes } = req.body;

    if (!airlineId || !destination || !scheduled_date) {
      res.status(400).json({ error: 'airlineId, destination, and scheduled_date are required' });
      return;
    }

    const schedule = await prisma.flightSchedule.create({
      data: {
        airlineId: parseInt(airlineId),
        destination,
        flight_number,
        scheduled_date: new Date(scheduled_date),
        expected_operations: expected_operations || 1,
        notes,
        created_by: req.user?.id,
      },
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
};

// PUT /api/flight-schedules/:id - Update schedule
export const updateSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { airlineId, destination, flight_number, scheduled_date, expected_operations, notes } = req.body;

    const existingSchedule = await prisma.flightSchedule.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: false,
      },
    });

    if (!existingSchedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    const updateData: any = {};
    if (airlineId !== undefined) updateData.airlineId = parseInt(airlineId);
    if (destination !== undefined) updateData.destination = destination;
    if (flight_number !== undefined) updateData.flight_number = flight_number;
    if (scheduled_date !== undefined) updateData.scheduled_date = new Date(scheduled_date);
    if (expected_operations !== undefined) updateData.expected_operations = expected_operations;
    if (notes !== undefined) updateData.notes = notes;

    const schedule = await prisma.flightSchedule.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json(schedule);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/flight-schedules/:id - Soft delete schedule
export const deleteSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const existingSchedule = await prisma.flightSchedule.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: false,
      },
    });

    if (!existingSchedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    await prisma.flightSchedule.update({
      where: { id: parseInt(id) },
      data: { is_deleted: true },
    });

    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/flight-schedules/comparison/:date - Compare scheduled vs realized operations for a specific date
export const getScheduleComparison = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date } = req.params;
    // Parse date as UTC to avoid timezone issues
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const nextDay = new Date(date + 'T23:59:59.999Z');

    // Get all schedules for the date
    const schedules = await prisma.flightSchedule.findMany({
      where: {
        scheduled_date: {
          gte: targetDate,
          lt: nextDay,
        },
        is_deleted: false,
      },
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get all fueling operations for the date
    const operations = await prisma.fuelingOperation.findMany({
      where: {
        dateTime: {
          gte: targetDate,
          lt: nextDay,
        },
        is_deleted: false,
      },
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Match schedules with operations using improved smart matching
    const comparison = schedules.map((schedule) => {
      const matchingOperations = operations.filter((op) => {
        // Destination matching: support partial match (e.g., "Istanbul" matches "Istanbul Sabiha Gökçen")
        const scheduleDestination = schedule.destination.toLowerCase();
        const opDestination = op.destination.toLowerCase();
        const destinationMatch = 
          scheduleDestination.includes(opDestination) || 
          opDestination.includes(scheduleDestination);
        
        if (!destinationMatch) return false;

        // Enhanced airline matching: support multiple Wizz Air subsidiaries
        const scheduleAirlineName = schedule.airline.name.toLowerCase();
        const opAirlineName = op.airline.name.toLowerCase();
        
        // Check for exact match first
        if (scheduleAirlineName === opAirlineName || op.airlineId === schedule.airlineId) {
          return true;
        }
        
        // Check for partial match (bidirectional)
        const airlineMatch = 
          scheduleAirlineName.includes(opAirlineName) || 
          opAirlineName.includes(scheduleAirlineName);
        
        if (airlineMatch) return true;
        
        // Special case: Wizz Air matching logic
        // If schedule is "Wizz Air" (or any Wizz Air subsidiary) and operation is also Wizz Air
        const isWizzAirSchedule = scheduleAirlineName.includes('wizz') && scheduleAirlineName.includes('air');
        const isWizzAirOperation = opAirlineName.includes('wizz') && opAirlineName.includes('air');
        
        if (isWizzAirSchedule && isWizzAirOperation) {
          return true;
        }
        
        return false;
      });

      return {
        schedule: {
          id: schedule.id,
          airline: schedule.airline,
          destination: schedule.destination,
          flight_number: schedule.flight_number,
          scheduled_date: schedule.scheduled_date,
          expected_operations: schedule.expected_operations,
          notes: schedule.notes,
        },
        realized: {
          count: matchingOperations.length,
          operations: matchingOperations.map((op) => ({
            id: op.id,
            dateTime: op.dateTime,
            flight_number: op.flight_number,
            quantity_liters: op.quantity_liters,
            operator_name: op.operator_name,
          })),
        },
        status:
          matchingOperations.length >= schedule.expected_operations
            ? 'completed'
            : matchingOperations.length > 0
            ? 'partial'
            : 'missing',
      };
    });

    // Also include operations without schedules (using same enhanced smart matching logic)
    const unmatchedOperations = operations.filter((op) => {
      return !schedules.some((schedule) => {
        // Same enhanced matching logic as above
        const scheduleDestination = schedule.destination.toLowerCase();
        const opDestination = op.destination.toLowerCase();
        const destinationMatch = 
          scheduleDestination.includes(opDestination) || 
          opDestination.includes(scheduleDestination);
        
        if (!destinationMatch) return false;

        const scheduleAirlineName = schedule.airline.name.toLowerCase();
        const opAirlineName = op.airline.name.toLowerCase();
        
        // Check for exact match first
        if (scheduleAirlineName === opAirlineName || op.airlineId === schedule.airlineId) {
          return true;
        }
        
        // Check for partial match (bidirectional)
        const airlineMatch = 
          scheduleAirlineName.includes(opAirlineName) || 
          opAirlineName.includes(scheduleAirlineName);
        
        if (airlineMatch) return true;
        
        // Special case: Wizz Air matching logic
        const isWizzAirSchedule = scheduleAirlineName.includes('wizz') && scheduleAirlineName.includes('air');
        const isWizzAirOperation = opAirlineName.includes('wizz') && opAirlineName.includes('air');
        
        if (isWizzAirSchedule && isWizzAirOperation) {
          return true;
        }
        
        return false;
      });
    });

    res.status(200).json({
      date: targetDate,
      comparison,
      unscheduled: unmatchedOperations.map((op) => ({
        id: op.id,
        airline: op.airline,
        destination: op.destination,
        flight_number: op.flight_number,
        dateTime: op.dateTime,
        quantity_liters: op.quantity_liters,
        operator_name: op.operator_name,
      })),
      summary: {
        totalScheduled: schedules.length,
        totalCompleted: comparison.filter((c) => c.status === 'completed').length,
        totalPartial: comparison.filter((c) => c.status === 'partial').length,
        totalMissing: comparison.filter((c) => c.status === 'missing').length,
        totalUnscheduled: unmatchedOperations.length,
        totalOperations: operations.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/flight-schedules/bulk - Bulk delete schedules
export const bulkDeleteSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, airlineId } = req.body;

    const where: any = {
      is_deleted: false,
    };

    if (startDate && endDate) {
      where.scheduled_date = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    if (airlineId) {
      where.airlineId = parseInt(airlineId);
    }

    // Soft delete matching schedules
    const result = await prisma.flightSchedule.updateMany({
      where,
      data: {
        is_deleted: true,
      },
    });

    res.status(200).json({
      message: `${result.count} schedule(s) deleted successfully`,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/flight-schedules/month/:year/:month - Get schedules for a specific month with comparison
export const getMonthSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.params;
    const { airlineId } = req.query;
    
    // Create dates as UTC to avoid timezone issues
    const startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59));

    const where: any = {
      scheduled_date: {
        gte: startDate,
        lte: endDate,
      },
      is_deleted: false,
    };

    if (airlineId) {
      where.airlineId = parseInt(airlineId as string);
    }

    const schedules = await prisma.flightSchedule.findMany({
      where,
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduled_date: 'asc',
      },
    });

    // Get operations for the same period
    const operationWhere: any = {
      dateTime: {
        gte: startDate,
        lte: endDate,
      },
      is_deleted: false,
    };

    if (airlineId) {
      operationWhere.airlineId = parseInt(airlineId as string);
    }

    const operations = await prisma.fuelingOperation.findMany({
      where: operationWhere,
      include: {
        airline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by date
    const dailyData: any = {};
    
    schedules.forEach((schedule) => {
      const dateKey = schedule.scheduled_date.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: schedule.scheduled_date,
          schedules: [],
          operations: [],
        };
      }
      dailyData[dateKey].schedules.push(schedule);
    });

    operations.forEach((operation) => {
      const dateKey = operation.dateTime.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: operation.dateTime,
          schedules: [],
          operations: [],
        };
      }
      dailyData[dateKey].operations.push(operation);
    });

    // Calculate statistics
    const stats = {
      totalSchedules: schedules.length,
      totalExpectedOperations: schedules.reduce((sum, s) => sum + s.expected_operations, 0),
      totalRealizedOperations: operations.length,
      realizationRate: schedules.length > 0 
        ? (operations.length / schedules.reduce((sum, s) => sum + s.expected_operations, 0)) * 100 
        : 0,
    };

    res.status(200).json({
      year: parseInt(year),
      month: parseInt(month),
      startDate,
      endDate,
      dailyData: Object.values(dailyData),
      schedules,
      operations,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/flight-schedules/statistics/:period - Get period statistics (weekly or monthly)
export const getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { period } = req.params; // 'weekly' or 'monthly'
    const { startDate, endDate, airlineId } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    const start = new Date((startDate as string) + 'T00:00:00.000Z');
    const end = new Date((endDate as string) + 'T23:59:59.999Z');

    // Build where clause for operations
    const operationWhere: any = {
      dateTime: {
        gte: start,
        lte: end,
      },
    };

    if (airlineId) {
      operationWhere.airlineId = parseInt(airlineId as string);
    }

    // Get all schedules and operations for the period
    const schedules = await prisma.flightSchedule.findMany({
      where: {
        is_deleted: false,
        scheduled_date: {
          gte: start,
          lte: end,
        },
        ...(airlineId ? { airlineId: parseInt(airlineId as string) } : {}),
      },
      include: {
        airline: true,
      },
    });

    const operations = await prisma.fuelingOperation.findMany({
      where: operationWhere,
      include: {
        airline: true,
      },
    });

    let intervals: Date[];
    let formatString: string;

    if (period === 'weekly') {
      intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }); // Monday as start
      formatString = "yyyy-'W'ww";
    } else {
      // monthly
      intervals = eachMonthOfInterval({ start, end });
      formatString = 'yyyy-MM';
    }

    const statistics = intervals.map((intervalStart) => {
      const intervalEnd = period === 'weekly' 
        ? endOfWeek(intervalStart, { weekStartsOn: 1 })
        : endOfMonth(intervalStart);

      // Filter schedules for this interval
      const periodSchedules = schedules.filter(
        (s) => s.scheduled_date >= intervalStart && s.scheduled_date <= intervalEnd
      );

      // Filter operations for this interval
      const periodOperations = operations.filter(
        (op) => op.dateTime >= intervalStart && op.dateTime <= intervalEnd
      );

      // Match operations with schedules using the same enhanced smart matching logic
      const matchedOperations = new Set();
      const scheduledWithMatch = periodSchedules.map((schedule) => {
        const matching = periodOperations.filter((op) => {
          if (matchedOperations.has(op.id)) return false;

          const scheduleDestination = schedule.destination.toLowerCase();
          const opDestination = op.destination.toLowerCase();
          const destinationMatch = 
            scheduleDestination.includes(opDestination) || 
            opDestination.includes(scheduleDestination);
          
          if (!destinationMatch) return false;

          const scheduleAirlineName = schedule.airline.name.toLowerCase();
          const opAirlineName = op.airline.name.toLowerCase();
          
          // Check for exact match first
          if (scheduleAirlineName === opAirlineName || op.airlineId === schedule.airlineId) {
            return true;
          }
          
          // Check for partial match (bidirectional)
          const airlineMatch = 
            scheduleAirlineName.includes(opAirlineName) || 
            opAirlineName.includes(scheduleAirlineName);
          
          if (airlineMatch) return true;
          
          // Special case: Wizz Air matching logic
          const isWizzAirSchedule = scheduleAirlineName.includes('wizz') && scheduleAirlineName.includes('air');
          const isWizzAirOperation = opAirlineName.includes('wizz') && opAirlineName.includes('air');
          
          if (isWizzAirSchedule && isWizzAirOperation) {
            return true;
          }
          
          return false;
        });

        matching.forEach((op) => matchedOperations.add(op.id));
        return matching.length;
      });

      const totalScheduled = periodSchedules.reduce((sum, s) => sum + s.expected_operations, 0);
      const totalRealized = matchedOperations.size;
      const totalUnplanned = periodOperations.length - totalRealized;

      return {
        period: format(intervalStart, formatString),
        label: period === 'weekly'
          ? `Sedmica ${format(intervalStart, 'w, yyyy')} (${format(intervalStart, 'dd.MM')} - ${format(intervalEnd, 'dd.MM')})`
          : format(intervalStart, 'MMMM yyyy'),
        startDate: intervalStart.toISOString(),
        endDate: intervalEnd.toISOString(),
        scheduled: totalScheduled,
        realized: totalRealized,
        unplanned: totalUnplanned,
        realizationRate: totalScheduled > 0 ? (totalRealized / totalScheduled) * 100 : 0,
      };
    });

    res.status(200).json({
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      statistics,
    });
  } catch (error) {
    next(error);
  }
};

