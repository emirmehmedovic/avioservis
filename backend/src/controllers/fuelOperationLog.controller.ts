import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { getFuelOperations, getFuelOperationDetails, FuelOperationType } from '../utils/fuelAuditUtils';

const prisma = new PrismaClient();

/**
 * Dohvaća listu operacija s gorivom s paginacijom i filtriranjem
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const getAllFuelOperationLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      pageSize = '20',
      operationType,
      sourceEntityType,
      sourceEntityId,
      targetEntityType,
      targetEntityId,
      userId,
      startDate,
      endDate,
      fuelType,
      success,
    } = req.query;

    // Validacija ulaznih parametara i konverzija tipova
    const parsedPage = parseInt(page as string, 10);
    const parsedPageSize = parseInt(pageSize as string, 10);
    const parsedSourceEntityId = sourceEntityId ? parseInt(sourceEntityId as string, 10) : undefined;
    const parsedTargetEntityId = targetEntityId ? parseInt(targetEntityId as string, 10) : undefined;
    const parsedUserId = userId ? parseInt(userId as string, 10) : undefined;
    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;
    const parsedSuccess = success !== undefined ? (success === 'true') : undefined;

    // Pozovi funkciju za dohvaćanje logova
    const result = await getFuelOperations({
      page: parsedPage,
      pageSize: parsedPageSize,
      operationType: operationType as FuelOperationType,
      sourceEntityType: sourceEntityType as string,
      sourceEntityId: parsedSourceEntityId,
      targetEntityType: targetEntityType as string,
      targetEntityId: parsedTargetEntityId,
      userId: parsedUserId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      fuelType: fuelType as string,
      success: parsedSuccess
    });

    // Transformiraj podatke za API odgovor
    const response = {
      data: result.data.map(log => ({
        ...log,
        // Pretvori JSON stringove u objekte za lakše korištenje na frontendu
        details: JSON.parse(log.details),
        stateBefore: JSON.parse(log.stateBefore),
        stateAfter: JSON.parse(log.stateAfter)
      })),
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize)
      }
    };

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    logger.error('Greška prilikom dohvaćanja logova operacija goriva:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom dohvaćanja logova operacija goriva',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};

/**
 * Dohvaća detalje jedne operacije s gorivom po ID-u
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const getFuelOperationLogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id, 10))) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Nevalidan ID operacije'
      });
      return;
    }

    const operationId = parseInt(id, 10);
    const operation = await getFuelOperationDetails(operationId);

    if (!operation) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: `Operacija s ID-om ${id} nije pronađena`
      });
      return;
    }

    // Pretvori JSON stringove u objekte za lakše korištenje na frontendu
    const response = {
      ...operation,
      details: JSON.parse(operation.details),
      stateBefore: JSON.parse(operation.stateBefore),
      stateAfter: JSON.parse(operation.stateAfter)
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error(`Greška prilikom dohvaćanja operacije goriva s ID-om ${req.params.id}:`, error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom dohvaćanja detalja operacije goriva',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};

/**
 * Dohvaća sumarni izvještaj o operacijama s gorivom
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const getFuelOperationsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const parsedStartDate = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default: zadnjih 30 dana
    const parsedEndDate = endDate ? new Date(endDate as string) : new Date();

    // Koristi raw Prisma upit za dobivanje sumiranih podataka
    const summary = await (prisma as any).fuelOperationLog.groupBy({
      by: ['operationType'],
      where: {
        timestamp: {
          gte: parsedStartDate,
          lte: parsedEndDate
        }
      },
      _count: {
        id: true
      },
      _sum: {
        quantityLiters: true
      }
    });

    // Dohvati broj uspješnih i neuspješnih operacija
    const successCounts = await (prisma as any).fuelOperationLog.groupBy({
      by: ['success'],
      where: {
        timestamp: {
          gte: parsedStartDate,
          lte: parsedEndDate
        }
      },
      _count: {
        id: true
      }
    });

    // Formatiranje rezultata za API odgovor
    const successCount = successCounts.find((item: any) => item.success === true)?._count?.id || 0;
    const failureCount = successCounts.find((item: any) => item.success === false)?._count?.id || 0;

    const response = {
      byOperationType: summary.map((item: any) => ({
        operationType: item.operationType,
        count: item._count.id,
        totalQuantity: item._sum.quantityLiters || 0
      })),
      totalOperations: summary.reduce((acc: number, item: any) => acc + item._count.id, 0),
      totalQuantity: summary.reduce((acc: number, item: any) => acc + (item._sum.quantityLiters || 0), 0),
      successRate: {
        successful: successCount,
        failed: failureCount,
        rate: successCount + failureCount > 0 ? successCount / (successCount + failureCount) * 100 : 100
      },
      period: {
        from: parsedStartDate,
        to: parsedEndDate
      }
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Greška prilikom generiranja izvještaja o operacijama goriva:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom generiranja izvještaja o operacijama goriva',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};

/**
 * Dohvaća trend operacija s gorivom kroz vrijeme
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const getFuelOperationsTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, interval = 'day' } = req.query;
    
    const parsedStartDate = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default: zadnjih 30 dana
    const parsedEndDate = endDate ? new Date(endDate as string) : new Date();

    // SQL fragment za grupiranje po intervalu (dnevno, tjedno, mjesečno)
    let dateGrouping;
    if (interval === 'week') {
      dateGrouping = `date_trunc('week', "timestamp"::timestamp)`;
    } else if (interval === 'month') {
      dateGrouping = `date_trunc('month', "timestamp"::timestamp)`;
    } else {
      dateGrouping = `date_trunc('day', "timestamp"::timestamp)`;
    }

    // Raw SQL upit za dohvaćanje trenda podataka
    const trend = await prisma.$queryRaw`
      SELECT 
        ${dateGrouping}::date as date,
        "operationType",
        COUNT(*) as count,
        SUM("quantityLiters") as total_quantity
      FROM "FuelOperationLog"
      WHERE "timestamp" >= ${parsedStartDate} AND "timestamp" <= ${parsedEndDate}
      GROUP BY date, "operationType"
      ORDER BY date ASC
    `;

    res.status(StatusCodes.OK).json({
      success: true,
      data: trend
    });
  } catch (error) {
    logger.error('Greška prilikom dohvaćanja trenda operacija goriva:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom dohvaćanja trenda operacija goriva',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};

/**
 * Dohvaća listu operacija s greškama
 * 
 * @param req Express zahtjev
 * @param res Express odgovor
 */
export const getFailedFuelOperations = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      pageSize = '20',
    } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const parsedPageSize = parseInt(pageSize as string, 10);

    // Pozovi funkciju za dohvaćanje logova sa success=false
    const result = await getFuelOperations({
      page: parsedPage,
      pageSize: parsedPageSize,
      success: false
    });

    // Transformiraj podatke za API odgovor
    const response = {
      data: result.data.map(log => ({
        ...log,
        details: JSON.parse(log.details),
        stateBefore: JSON.parse(log.stateBefore),
        stateAfter: JSON.parse(log.stateAfter)
      })),
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize)
      }
    };

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    logger.error('Greška prilikom dohvaćanja neuspješnih operacija goriva:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Greška prilikom dohvaćanja neuspješnih operacija goriva',
      error: error instanceof Error ? error.message : 'Nepoznata greška'
    });
  }
};
