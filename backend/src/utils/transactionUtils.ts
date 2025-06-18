import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { verifyTankConsistency, verifyMultipleTanksConsistency, TankConsistencyResult } from './fuelConsistencyUtils';
import { logFuelOperation, getTankStateForLogging, FuelOperationType } from './fuelAuditUtils';
import { Decimal } from '@prisma/client/runtime/library';

// LogSeverity enum matching the one in the Prisma schema
enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

const prisma = new PrismaClient();

/**
 * Executes a function within a database transaction with the highest isolation level (Serializable).
 * This ensures that transactions are fully isolated from one another, preventing concurrency issues.
 *
 * @param fn The function to execute within the transaction. It receives the transaction client.
 * @param options Transaction options.
 * @returns The result of the function execution.
 */
export async function executeInTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    maxRetries?: number;
    logActivity?: boolean;
    activityName?: string;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    logActivity = true,
    activityName = 'Database transaction',
    isolationLevel = Prisma.TransactionIsolationLevel.Serializable
  } = options;

  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= maxRetries) {
    try {
      const startTime = process.hrtime();

      if (logActivity) {
        logger.info(`Starting ${activityName} (attempt ${retries + 1}/${maxRetries + 1})`);
      }

      const result = await prisma.$transaction(async (tx) => {
        return await fn(tx);
      }, {
        isolationLevel,
        maxWait: 10000, // 10 seconds max wait
        timeout: 30000   // 30 seconds timeout
      });

      const endTime = process.hrtime(startTime);
      const executionTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);

      if (logActivity) {
        logger.info(`Completed ${activityName} in ${executionTimeMs}ms`);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isTransactionConflict = 
        error instanceof Prisma.PrismaClientKnownRequestError && 
        (error.code === 'P2034' || error.code === 'P2037'); // Serialization failure or retry limit exceeded

      if (isTransactionConflict && retries < maxRetries) {
        const backoffTime = Math.pow(2, retries) * 100 + Math.random() * 100;
        logger.warn(`Transaction conflict in ${activityName}, retrying in ${backoffTime.toFixed(0)}ms (attempt ${retries + 2}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        retries++;
      } else {
        logger.error(`Failed to execute ${activityName} after ${retries + 1} attempts:`, error);
        throw lastError;
      }
    }
  }

  throw lastError || new Error(`Failed to execute ${activityName} after ${maxRetries + 1} retries`);
}

/**
 * Executes a fuel-related operation within a transaction, with pre- and post-operation state logging and consistency checks.
 *
 * @param fn The function to execute within the transaction.
 * @param options Options for the fuel operation.
 * @returns The result of the function execution.
 */
export async function executeFuelOperation<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    tankIds: number[];
    operationType: string;
    userId?: number;
    notes?: string;
    maxRetries?: number;
    requestedQuantity?: Decimal;
    skipConsistencyCheck?: boolean;
    targetTankIds?: number[];
    fuelType?: string;
    overrideToken?: string;
  }
): Promise<T> {
  const { 
    tankIds, 
    operationType, 
    userId, 
    notes, 
    maxRetries = 3, 
    requestedQuantity,
    skipConsistencyCheck = false,
    targetTankIds = [],
    fuelType = 'JET-A1',
    overrideToken
  } = options;

  return executeInTransaction(async (tx) => {
    const initialTankStates = await Promise.all(
      tankIds.map(tankId => tx.fixedStorageTanks.findUnique({ where: { id: tankId }, select: { id: true, tank_name: true, current_quantity_liters: true } }))
    );
    
    const detailedInitialStates = await Promise.all(tankIds.map(tankId => getTankStateForLogging(tankId, tx)));
    const targetInitialStates = await Promise.all(targetTankIds.map(tankId => getTankStateForLogging(tankId, tx)));

    if (!skipConsistencyCheck) {
      try {
        logger.debug(`Performing pre-operation consistency check for ${operationType}...`);
        const consistencyResults = await verifyMultipleTanksConsistency(tankIds, tx);
        const inconsistentTanks = consistencyResults.filter(r => !r.isConsistent);

        if (inconsistentTanks.length > 0) {
          logger.warn(`Inconsistencies detected before ${operationType}:`, { inconsistentTanks });

          let overrideAllowed = false;
          if (overrideToken) {
            const validOverrides = tankIds.every(tankId => {
              const overrideKey = `tank_inconsistency_override_${tankId}`;
              const override = (global as any).overrideTokens?.[overrideKey];
              return override && override.token === overrideToken && new Date() < override.expires && override.operationType === operationType;
            });
            if (validOverrides) {
              logger.warn(`Administrator approved execution of ${operationType} despite tank inconsistencies.`, { overrideToken });
              overrideAllowed = true;
            }
          }

          if (!overrideAllowed) {
            throw new Error(`Operation ${operationType} aborted due to data inconsistency. Please review tank status.`);
          }
        }
      } catch (consistencyError) {
        logger.error(`Error during pre-operation consistency check for ${operationType}:`, consistencyError);
        throw consistencyError;
      }
    }

    const transactionId = `fuel-op-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await fn(tx);

    const finalTankStates = await Promise.all(
      tankIds.map(tankId => tx.fixedStorageTanks.findUnique({ where: { id: tankId }, select: { id: true, tank_name: true, current_quantity_liters: true } }))
    );
    const detailedFinalStates = await Promise.all(tankIds.map(tankId => getTankStateForLogging(tankId, tx)));
    const targetFinalStates = await Promise.all(targetTankIds.map(tankId => getTankStateForLogging(tankId, tx)));

    for (let i = 0; i < tankIds.length; i++) {
      const fuelOpType: FuelOperationType = operationType.includes('INTAKE') ? FuelOperationType.INTAKE :
                               operationType.includes('TRANSFER_BETWEEN') ? FuelOperationType.TRANSFER_BETWEEN_TANKS :
                               operationType.includes('TRANSFER_TO_TANKER') ? FuelOperationType.TRANSFER_TO_TANKER :
                               operationType.includes('FUELING') ? FuelOperationType.FUELING_OPERATION :
                               operationType.includes('DRAIN_REVERSE') ? FuelOperationType.DRAIN_REVERSE :
                               operationType.includes('DRAIN') ? FuelOperationType.DRAIN :
                               operationType.includes('SYNC') ? FuelOperationType.SYNC :
                               FuelOperationType.ADJUSTMENT;

      const initialQuantity = new Decimal(initialTankStates[i]?.current_quantity_liters || 0);
      const finalQuantity = new Decimal(finalTankStates[i]?.current_quantity_liters || 0);
      const quantityChange = finalQuantity.minus(initialQuantity).abs();

      await logFuelOperation(
        { operationType: fuelOpType, description: `${operationType}${notes ? ': ' + notes : ''}`, sourceEntityType: 'FixedStorageTank', sourceEntityId: tankIds[i], targetEntityType: targetTankIds[i] ? 'FixedStorageTank' : undefined, targetEntityId: targetTankIds[i], quantityLiters: requestedQuantity?.greaterThan(0) ? requestedQuantity : quantityChange, fuelType, userId, transactionId },
        { initialQuantity, finalQuantity, quantityChange, operationTime: new Date(), consistencyCheckSkipped: skipConsistencyCheck },
        detailedInitialStates[i], detailedFinalStates[i], tx
      );

      if (targetTankIds[i]) {
        const targetIndex = targetTankIds.indexOf(targetTankIds[i]);
        await logFuelOperation(
          { operationType: fuelOpType, description: `${operationType} (target tank)${notes ? ': ' + notes : ''}`, sourceEntityType: 'FixedStorageTank', sourceEntityId: targetTankIds[i], targetEntityType: 'FixedStorageTank', targetEntityId: tankIds[i], quantityLiters: requestedQuantity?.greaterThan(0) ? requestedQuantity : quantityChange, fuelType, userId, transactionId },
          { operationTime: new Date(), consistencyCheckSkipped: skipConsistencyCheck, isTargetTank: true },
          targetInitialStates[targetIndex] || { id: targetTankIds[i], notFound: true }, targetFinalStates[targetIndex] || { id: targetTankIds[i], notFound: true }, tx
        );
      }
    }

    if (!skipConsistencyCheck) {
      const postOpResults = await verifyMultipleTanksConsistency([...tankIds, ...targetTankIds], tx);
      const postOpInconsistent = postOpResults.filter(r => !r.isConsistent);
      if (postOpInconsistent.length > 0) {
        logger.warn(`Inconsistencies detected after ${operationType}:`, { postOpInconsistent });
        await tx.systemLog.create({ data: { action: `FUEL_DATA_INCONSISTENCY_AFTER_OPERATION`, details: JSON.stringify({ operationType, inconsistentTanks: postOpInconsistent, timestamp: new Date() }), severity: LogSeverity.WARNING, userId: userId || null } });
      }
    }

    await tx.systemLog.create({ data: { action: `FUEL_OPERATION_${operationType.toUpperCase()}`, details: JSON.stringify({ tankIds, initialStates: initialTankStates, finalStates: finalTankStates, quantityAffected: requestedQuantity, notes, timestamp: new Date() }), severity: LogSeverity.INFO, userId: userId || null } });

    return result;
  }, {
    maxRetries,
    logActivity: true,
    activityName: `Fuel operation: ${operationType}`,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
}

