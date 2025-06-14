import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { AnyTransactionClient } from './fuelConsistencyUtils';

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
  quantityLiters: number;
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
  tx?: AnyTransactionClient
): Promise<any> {
  const client = tx || prisma;
  
  try {
    // Vrsta operacije iz enuma pretvorena u string
    const operationType = String(logData.operationType);
    
    const logEntry = await (client as any).fuelOperationLog.create({
      data: {
        operationType: operationType as any,
        description: logData.description,
        details: JSON.stringify(details),
        stateBefore: JSON.stringify(stateBefore),
        stateAfter: JSON.stringify(stateAfter),
        sourceEntityType: logData.sourceEntityType,
        sourceEntityId: logData.sourceEntityId,
        targetEntityType: logData.targetEntityType,
        targetEntityId: logData.targetEntityId,
        quantityLiters: logData.quantityLiters,
        fuelType: logData.fuelType,
        userId: logData.userId,
        transactionId: logData.transactionId
      }
    });
    
    logger.debug(`Zapisana operacija goriva: ${logData.operationType}, ID: ${logEntry.id}`);
    return logEntry;
  } catch (error) {
    logger.error(`Greška prilikom bilježenja operacije goriva: ${error}`);
    // Ne bacamo grešku ovdje kako ne bi prekinuli glavnu operaciju
    return null;
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
  tx?: AnyTransactionClient
): Promise<any> {
  const client = tx || prisma;
  
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Vrsta operacije iz enuma pretvorena u string
    const operationType = String(logData.operationType);
    
    const logEntry = await (client as any).fuelOperationLog.create({
      data: {
        operationType: operationType as any,
        description: `NEUSPJEŠNO: ${logData.description}`,
        details: JSON.stringify({ error: errorMessage }),
        stateBefore: JSON.stringify(stateBefore),
        stateAfter: JSON.stringify(stateBefore), // Stanje nakon je isto kao prije jer operacija nije uspjela
        sourceEntityType: logData.sourceEntityType,
        sourceEntityId: logData.sourceEntityId,
        targetEntityType: logData.targetEntityType,
        targetEntityId: logData.targetEntityId,
        quantityLiters: logData.quantityLiters,
        fuelType: logData.fuelType,
        userId: logData.userId,
        transactionId: logData.transactionId,
        success: false,
        errorMessage: errorMessage
      }
    });
    
    logger.warn(`Zapisana neuspješna operacija goriva: ${logData.operationType}, ID: ${logEntry.id}`);
    return logEntry;
  } catch (logError) {
    logger.error(`Greška prilikom bilježenja neuspješne operacije goriva: ${logError}`);
    // Ne bacamo grešku ovdje kako ne bi prekinuli glavnu operaciju
    return null;
  }
}

/**
 * Dohvaća stanje tanka goriva za bilježenje
 * 
 * @param tankId ID tanka
 * @param client Prisma klijent
 * @returns Stanje tanka s MRN zapisima
 */
export async function getTankStateForLogging(tankId: number, client: AnyTransactionClient = prisma): Promise<EntityState> {
  try {
    // Dohvaćamo osnovne podatke o tanku izbjegavajući ugniježđene upite koji uzrokuju SelectionSetOnScalar grešku
    const tank = await client.fixedStorageTanks.findUnique({
      where: { id: tankId },
      select: {
        id: true,
        tank_name: true,
        tank_identifier: true,
        capacity_liters: true,
        current_quantity_liters: true,
        updatedAt: true,
        fuel_type: true // Direktno dohvaćamo fuel_type string
      }
    });
    
    if (!tank) {
      return { id: tankId, error: "Tank nije pronađen" };
    }
    
    // Zasebno dohvaćamo MRN zapise za tank
    const tankFuelByCustoms = await client.tankFuelByCustoms.findMany({
      where: { fixed_tank_id: tankId },
      select: {
        id: true,
        customs_declaration_number: true,
        quantity_liters: true,
        remaining_quantity_liters: true,
        date_added: true
      },
      orderBy: {
        date_added: 'asc'
      }
    });
    
    // Vraćamo rezultat koji ima isti format kao prije
    return {
      ...tank,
      tankFuelByCustoms
    };
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
export async function getFuelOperationDetails(operationId: number): Promise<any> {
  return await (prisma as any).fuelOperationLog.findUnique({
    where: { id: operationId },
    include: {
      user: {
        select: {
          id: true,
          username: true
        }
      }
    }
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
}): Promise<{ data: any[]; total: number; page: number; pageSize: number; }> {
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

  const skip = (page - 1) * pageSize;

  // Kreiraj filter na osnovu parametara
  const where: any = {};
  
  if (operationType) where.operationType = operationType;
  if (sourceEntityType) where.sourceEntityType = sourceEntityType;
  if (sourceEntityId) where.sourceEntityId = sourceEntityId;
  if (targetEntityType) where.targetEntityType = targetEntityType;
  if (targetEntityId) where.targetEntityId = targetEntityId;
  if (userId) where.userId = userId;
  if (fuelType) where.fuelType = fuelType;
  if (success !== undefined) where.success = success;
  
  // Raspon datuma
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  // Dohvati podatke s paginacijom
  const [data, total] = await Promise.all([
    (prisma as any).fuelOperationLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: pageSize
    }),
    (prisma as any).fuelOperationLog.count({ where })
  ]);

  return {
    data,
    total,
    page,
    pageSize
  };
}
