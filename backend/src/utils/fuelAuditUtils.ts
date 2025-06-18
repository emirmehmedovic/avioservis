import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { Decimal } from '@prisma/client/runtime/library';

// Moguće vrijednosti FuelOperationType enuma
export enum FuelOperationType {
  INTAKE = 'INTAKE',
  TRANSFER_BETWEEN_TANKS = 'TRANSFER_BETWEEN_TANKS',
  TRANSFER_TO_TANKER = 'TRANSFER_TO_TANKER',
  FUELING_OPERATION = 'FUELING_OPERATION',
  DRAIN = 'DRAIN',
  DRAIN_REVERSE = 'DRAIN_REVERSE',
  ADJUSTMENT = 'ADJUSTMENT',
  SYNC = 'SYNC'
}

const prisma = new PrismaClient();

/**
 * Interfejs koji definiše osnovne podatke za log operacije s gorivom
 */
export interface FuelOperationLogData {
  operationType: FuelOperationType;
  description: string;
  sourceEntityType: string;
  sourceEntityId: number;
  targetEntityType?: string;
  targetEntityId?: number;
  quantityLiters: Decimal;
  fuelType: string;
  userId?: number;
  transactionId?: string;
}

/**
 * Interfejs koji definiše dodatne detalje za log operacije
 */
export interface FuelOperationDetails {
  [key: string]: any;
}

/**
 * Interfejs koji definiše stanje entiteta prije/poslije operacije
 */
export interface EntityState {
  [key: string]: any;
}

/**
 * Bilježi operaciju s gorivom u FuelOperationLog
 * 
 * @param logData Osnovni podaci o operaciji
 * @param details Dodatni detalji operacije
 * @param stateBefore Stanje entiteta prije operacije
 * @param stateAfter Stanje entiteta nakon operacije
 * @param tx Opcionalni transakcijski klijent
 * @returns Kreirani zapis loga
 */
export async function logFuelOperation(
  logData: FuelOperationLogData,
  details: FuelOperationDetails,
  stateBefore: EntityState,
  stateAfter: EntityState,
  tx?: Prisma.TransactionClient
): Promise<Prisma.FuelOperationLogGetPayload<{}>> {
  const client = tx || prisma;
  
  try {
    const logEntry = await client.fuelOperationLog.create({
      data: {
        operationType: logData.operationType,
        description: logData.description,
        details: JSON.stringify(details),
        stateBefore: JSON.stringify(stateBefore),
        stateAfter: JSON.stringify(stateAfter),
        sourceEntityType: logData.sourceEntityType,
        sourceEntityId: logData.sourceEntityId,
        targetEntityType: logData.targetEntityType,
        targetEntityId: logData.targetEntityId,
        quantityLiters: logData.quantityLiters.toNumber(), // Convert Decimal to number for logging
        fuelType: logData.fuelType,
        userId: logData.userId,
        transactionId: logData.transactionId
      }
    });
    
    logger.debug(`Zapisana operacija goriva: ${logData.operationType}, ID: ${logEntry.id}`);
    return logEntry;
  } catch (error) {
    logger.error(`Greška prilikom bilježenja operacije goriva: ${error}`);
    throw new Error(`Failed to log fuel operation: ${error}`);
  }
}

/**
 * Bilježi neuspješnu operaciju s gorivom
 * 
 * @param logData Osnovni podaci o operaciji
 * @param error Detalji greške
 * @param stateBefore Stanje entiteta prije operacije
 * @param tx Opcionalni transakcijski klijent
 * @returns Kreirani zapis loga
 */
export async function logFailedFuelOperation(
  logData: FuelOperationLogData,
  error: any,
  stateBefore: EntityState,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;
  
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logEntry = await client.fuelOperationLog.create({
      data: {
        operationType: logData.operationType,
        description: `NEUSPJEŠNO: ${logData.description}`,
        details: JSON.stringify({ error: errorMessage }),
        stateBefore: JSON.stringify(stateBefore),
        stateAfter: JSON.stringify(stateBefore), // Stanje nakon je isto kao prije jer operacija nije uspjela
        sourceEntityType: logData.sourceEntityType,
        sourceEntityId: logData.sourceEntityId,
        targetEntityType: logData.targetEntityType,
        targetEntityId: logData.targetEntityId,
        quantityLiters: logData.quantityLiters.toNumber(), // Convert Decimal to number for logging
        fuelType: logData.fuelType,
        userId: logData.userId,
        transactionId: logData.transactionId,
        success: false,
        errorMessage: errorMessage
      }
    });
    
    logger.warn(`Zapisana neuspješna operacija goriva: ${logData.operationType}, ID: ${logEntry.id}`);
  } catch (logError) {
    logger.error(`Greška prilikom bilježenja neuspješne operacije goriva: ${logError}`);
  }
}

/**
 * Dohvaća stanje tanka goriva za bilježenje
 * 
 * @param tankId ID tanka
 * @param client Prisma klijent
 * @returns Stanje tanka s MRN zapisima
 */
export async function getTankStateForLogging(
  tankId: number,
  client: Prisma.TransactionClient | PrismaClient = prisma
): Promise<EntityState> {
  try {
    const tank = await client.fixedStorageTanks.findUnique({
      where: { id: tankId },
      include: {
        tankFuelByCustoms: {
          orderBy: { date_added: 'asc' }
        }
      }
    });
    
    if (!tank) {
      return { id: tankId, error: "Tank nije pronađen" };
    }
    
    return tank;
  } catch (error) {
    logger.error(`Greška prilikom dohvaćanja stanja tanka ${tankId} za log: ${error}`);
    return { id: tankId, error: "Greška prilikom dohvaćanja podataka" };
  }
}

/**
 * Dohvaća detalje operacije po ID-u
 * 
 * @param operationId ID operacije
 * @returns Detaljni zapis operacije
 */
export async function getFuelOperationDetails(operationId: number) {
  return await prisma.fuelOperationLog.findUnique({
    where: { id: operationId }
  });
}

/**
 * Dohvaća listu operacija s paginacijom i filtriranjem
 * 
 * @param params Parametri za filtriranje i paginaciju
 * @returns Lista operacija
 */
export async function getFuelOperations(params: {
  page?: number;
  pageSize?: number;
  operationType?: FuelOperationType | string;
  sourceEntityType?: string;
  sourceEntityId?: number;
  targetEntityType?: string;
  targetEntityId?: number;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  fuelType?: string;
  success?: boolean;
}) {
  const { 
    page = 1, 
    pageSize = 20, 
    operationType, 
    sourceEntityType, 
    sourceEntityId, 
    targetEntityType, 
    targetEntityId, 
    userId, 
    startDate, 
    endDate, 
    fuelType,
    success
  } = params;

  const where: Prisma.FuelOperationLogWhereInput = {};
  if (operationType) where.operationType = operationType as FuelOperationType;
  if (sourceEntityType) where.sourceEntityType = sourceEntityType;
  if (sourceEntityId) where.sourceEntityId = sourceEntityId;
  if (targetEntityType) where.targetEntityType = targetEntityType;
  if (targetEntityId) where.targetEntityId = targetEntityId;
  if (userId) where.userId = userId;
  if (fuelType) where.fuelType = fuelType;
  if (success !== undefined) where.success = success;
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const [data, total] = await prisma.$transaction([
    prisma.fuelOperationLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { timestamp: 'desc' }
    }),
    prisma.fuelOperationLog.count({ where })
  ]);

  return {
    data,
    total,
    page,
    pageSize
  };
}
