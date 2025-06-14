import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { verifyTankConsistency, verifyMultipleTanksConsistency, canPerformFuelOperation, AnyTransactionClient, ExtendedTransactionClient, TankConsistencyResult } from './fuelConsistencyUtils';
import { logFuelOperation, logFailedFuelOperation, getTankStateForLogging, FuelOperationType } from './fuelAuditUtils';

// Definiramo LogSeverity enum koji odgovara onome u Prisma shemi
enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Koristimo već definirani ExtendedTransactionClient iz fuelConsistencyUtils.ts

const prisma = new PrismaClient();

/**
 * Izvršava funkciju unutar transakcije s najvišim nivoom izolacije (Serializable)
 * Ovo osigurava da se transakcije izvršavaju potpuno izolirano jedna od druge
 * i sprječava probleme s konkurentnim pristupom podacima
 * 
 * @param fn - Funkcija koja će se izvršiti unutar transakcije
 * @param options - Opcije za transakciju
 * @returns Rezultat izvršavanja funkcije
 */
export async function executeInTransaction<T>(
  fn: (tx: ExtendedTransactionClient) => Promise<T>,
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
      
      // Izvršavanje transakcije s definiranim nivoom izolacije
      const result = await prisma.$transaction(async (tx) => {
        return await fn(tx as unknown as ExtendedTransactionClient);
      }, {
        isolationLevel,
        maxWait: 10000, // 10 sekundi maksimalno čekanje
        timeout: 30000   // 30 sekundi timeout za transakciju
      });
      
      const endTime = process.hrtime(startTime);
      const executionTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
      
      if (logActivity) {
        logger.info(`Completed ${activityName} in ${executionTimeMs}ms`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Provjeri je li greška zbog konflikta transakcija
      const isTransactionConflict = 
        error instanceof Prisma.PrismaClientKnownRequestError && 
        (error.code === 'P2034' || // Serialization failure
         error.code === 'P2037' || // Transaction retry limit exceeded
         error.message.includes('could not serialize access') ||
         error.message.includes('deadlock detected'));
      
      if (isTransactionConflict && retries < maxRetries) {
        // Eksponencijalno povećanje vremena čekanja između pokušaja
        const backoffTime = Math.pow(2, retries) * 100 + Math.random() * 100;
        
        logger.warn(`Transaction conflict detected in ${activityName}, retrying in ${backoffTime.toFixed(0)}ms (attempt ${retries + 1}/${maxRetries})`);
        
        // Čekaj prije ponovnog pokušaja
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        retries++;
      } else {
        // Ako nije konflikt transakcija ili smo iskoristili sve pokušaje, propagiraj grešku
        logger.error(`Error in ${activityName} (attempt ${retries + 1}/${maxRetries + 1}):`, error);
        throw lastError;
      }
    }
  }
  
  // Ovo se ne bi trebalo dogoditi, ali TypeScript zahtijeva return statement
  throw lastError || new Error(`Failed to execute ${activityName} after ${maxRetries} retries`);
}

/**
 * Izvršava funkciju unutar transakcije s najvišim nivoom izolacije i prati stanje prije i poslije
 * za operacije s gorivom. Ovo je posebno korisno za operacije koje mijenjaju stanje tankova.
 * 
 * @param fn - Funkcija koja će se izvršiti unutar transakcije
 * @param options - Opcije za transakciju
 * @returns Rezultat izvršavanja funkcije
 */
export async function executeFuelOperation<T>(
  fn: (tx: ExtendedTransactionClient) => Promise<T>,
  options: {
    tankIds: number[];
    operationType: string;
    userId?: number;
    notes?: string;
    maxRetries?: number;
    requestedQuantity?: number;
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
    fuelType = 'JET-A1', // Podrazumijevani tip goriva
    overrideToken
  } = options;
  
  return executeInTransaction(async (tx) => {
    // Dohvati početno stanje tankova za UI prikaz i operativnu logiku
    const initialTankStates = await Promise.all(
      tankIds.map(async (tankId) => {
        const tank = await tx.fixedStorageTanks.findUnique({
          where: { id: tankId },
          select: {
            id: true,
            tank_name: true,
            current_quantity_liters: true
          }
        });
        return tank;
      })
    );
    
    // Dohvati detaljno početno stanje tankova za logiranje
    const detailedInitialStates = await Promise.all(
      tankIds.map(tankId => getTankStateForLogging(tankId, tx))
    );
    
    // Dohvati početno stanje odredišnih tankova ako postoje
    const targetInitialStates = targetTankIds.length > 0 ? 
      await Promise.all(targetTankIds.map(tankId => getTankStateForLogging(tankId, tx))) : 
      [];
    
    // Provjeri konzistentnost podataka prije operacije ako nije preskočeno
    let inconsistentTanksBefore: any[] = [];
    if (!skipConsistencyCheck) {
      try {
        logger.debug(`Provjera konzistentnosti prije ${operationType} operacije...`);
        const consistencyResults = await verifyMultipleTanksConsistency(tankIds, tx);
        inconsistentTanksBefore = consistencyResults
          .filter((result: TankConsistencyResult) => !result.isConsistent)
          .map((result: TankConsistencyResult) => ({
            tankId: result.tankId,
            tankName: result.tankName,
            difference: parseFloat(result.difference.toFixed(3))
          }));
        
        if (inconsistentTanksBefore.length > 0) {
          logger.warn(`Detektirane nekonzistentnosti prije ${operationType} operacije:`, {
            inconsistentTanks: inconsistentTanksBefore
          });
          
          // Provjeri postoji li override token za ovo izvršavanje
          let overrideAllowed = false;
          
          if (overrideToken && tankIds.length > 0) {
            // Provjera valjanosti override tokena za svaki tank
            const validOverrides = tankIds.filter(tankId => {
              const overrideKey = `tank_inconsistency_override_${tankId}`;
              const override = global.overrideTokens?.[overrideKey];
              
              if (!override) return false;
              
              // Provjeri je li token valjan i nije istekao
              const isValid = override.token === overrideToken && 
                           new Date() < override.expires &&
                           override.operationType === operationType;
              
              return isValid;
            });
            
            // Ako postoje validni override tokeni za sve tankove, dozvoli operaciju
            overrideAllowed = validOverrides.length === tankIds.length;
            
            if (overrideAllowed) {
              logger.warn(`Administrator je odobrio izvršenje operacije ${operationType} usprkos nekonzistentnosti u tankovima`, {
                inconsistentTanks: inconsistentTanksBefore,
                overrideToken: overrideToken
              });
            }
          }
          
          // Ako je zatražena određena količina goriva i imamo nekonzistentnosti
          if (requestedQuantity && !overrideAllowed) {
            // Provjerimo razinu nekonzistentnosti - ako je relativno mala, dopustimo operaciju uz upozorenje
            const severeInconsistencies = inconsistentTanksBefore.filter(t => {
              // Izračunaj relativnu razliku (postotak od ukupne količine tanka)
              const relativeError = t.difference / t.currentQuantityLiters;
              return relativeError > 0.05; // 5% relativne razlike smatramo ozbiljnim
            });
            
            if (severeInconsistencies.length === 0) {
              // Samo male nekonzistentnosti - nastavimo uz upozorenje
              logger.warn(`Pronađene su manje nekonzistentnosti u tankovima: ${inconsistentTanksBefore.map(t => `${t.tankName} (razlika: ${t.difference.toFixed(2)} L, ${((t.difference / t.currentQuantityLiters) * 100).toFixed(2)}%)`).join(', ')}, ali operacija se nastavlja.`);
            } else {
              // Ozbiljne nekonzistentnosti - prekini operaciju
              throw new Error(`Otkrivene su velike nekonzistentnosti u tankovima: ${severeInconsistencies.map(t => `${t.tankName} (razlika: ${t.difference.toFixed(2)} L, ${((t.difference / t.currentQuantityLiters) * 100).toFixed(2)}%)`).join(', ')}. Operacija je zaustavljena.`);
            }
          }
        }
      } catch (consistencyError) {
        logger.error(`Greška prilikom provjere konzistentnosti prije ${operationType} operacije:`, consistencyError);
        throw consistencyError;
      }
    }
    
    // Kreiraj jedinstveni ID transakcije za grupiranje povezanih logova
    const transactionId = `fuel-op-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Izvrši operaciju
    const result = await fn(tx);
    
    // Dohvati završno stanje tankova za UI prikaz i operativnu logiku
    const finalTankStates = await Promise.all(
      tankIds.map(async (tankId) => {
        const tank = await tx.fixedStorageTanks.findUnique({
          where: { id: tankId },
          select: {
            id: true,
            tank_name: true,
            current_quantity_liters: true
          }
        });
        return tank;
      })
    );
    
    // Dohvati detaljno završno stanje tankova za logiranje
    const detailedFinalStates = await Promise.all(
      tankIds.map(tankId => getTankStateForLogging(tankId, tx))
    );
    
    // Dohvati završno stanje odredišnih tankova ako postoje
    const targetFinalStates = targetTankIds.length > 0 ? 
      await Promise.all(targetTankIds.map(tankId => getTankStateForLogging(tankId, tx))) : 
      [];
    
    // Pripremi podatke za logiranje operacije
    for (let i = 0; i < tankIds.length; i++) {
      // Mapiraj string tip operacije u FuelOperationType enum
      let fuelOpType: FuelOperationType;
      
      if (operationType.includes('INTAKE')) fuelOpType = FuelOperationType.INTAKE;
      else if (operationType.includes('TRANSFER_BETWEEN')) fuelOpType = FuelOperationType.TRANSFER_BETWEEN_TANKS;
      else if (operationType.includes('TRANSFER_TO_TANKER')) fuelOpType = FuelOperationType.TRANSFER_TO_TANKER;
      else if (operationType.includes('FUELING')) fuelOpType = FuelOperationType.FUELING_OPERATION;
      else if (operationType.includes('DRAIN_REVERSE')) fuelOpType = FuelOperationType.DRAIN_REVERSE;
      else if (operationType.includes('DRAIN')) fuelOpType = FuelOperationType.DRAIN;
      else if (operationType.includes('SYNC')) fuelOpType = FuelOperationType.SYNC;
      else fuelOpType = FuelOperationType.ADJUSTMENT;
      
      // Izračunaj količinu koja je promijenjena
      const initialQuantity = initialTankStates[i]?.current_quantity_liters || 0;
      const finalQuantity = finalTankStates[i]?.current_quantity_liters || 0;
      const quantityChange = Math.abs(finalQuantity - initialQuantity);
      
      // Logiraj operaciju za trenutni tank
      await logFuelOperation(
        {
          operationType: fuelOpType,
          description: `${operationType}${notes ? ': ' + notes : ''}`,
          sourceEntityType: 'FixedStorageTank',
          sourceEntityId: tankIds[i],
          targetEntityType: targetTankIds[i] ? 'FixedStorageTank' : undefined,
          targetEntityId: targetTankIds[i],
          quantityLiters: requestedQuantity || quantityChange,
          fuelType,
          userId,
          transactionId
        },
        { // Dodatni detalji
          initialQuantity,
          finalQuantity,
          quantityChange,
          operationTime: new Date(),
          consistencyCheckSkipped: skipConsistencyCheck
        },
        detailedInitialStates[i], // Stanje prije
        detailedFinalStates[i],  // Stanje poslije
        tx
      );
      
      // Logiraj i za odredišni tank ako postoji
      if (targetTankIds[i]) {
        const targetIndex = targetTankIds.indexOf(targetTankIds[i]);
        await logFuelOperation(
          {
            operationType: fuelOpType,
            description: `${operationType} (odredišni tank)${notes ? ': ' + notes : ''}`,
            sourceEntityType: 'FixedStorageTank',
            sourceEntityId: targetTankIds[i],
            targetEntityType: 'FixedStorageTank',
            targetEntityId: tankIds[i],
            quantityLiters: requestedQuantity || quantityChange,
            fuelType,
            userId,
            transactionId
          },
          {
            operationTime: new Date(),
            consistencyCheckSkipped: skipConsistencyCheck,
            isTargetTank: true
          },
          targetInitialStates[targetIndex] || { id: targetTankIds[i], notFound: true },
          targetFinalStates[targetIndex] || { id: targetTankIds[i], notFound: true },
          tx
        );
      }
    }
    
    // Provjeri konzistentnost podataka nakon operacije ako nije preskočeno
    if (!skipConsistencyCheck) {
      const postOpConsistencyResults = await Promise.all(
        tankIds.map(async (tankId) => {
          return await verifyTankConsistency(tankId, tx);
        })
      );
      
      // Provjeri rezultate konzistentnosti nakon operacije
      const postOpInconsistentTanks = postOpConsistencyResults.filter(result => !result.isConsistent);
      if (postOpInconsistentTanks.length > 0) {
        logger.warn(`Detektirane nekonzistentnosti nakon ${operationType} operacije:`, {
          inconsistentTanks: postOpInconsistentTanks.map(t => ({
            tankId: t.tankId,
            tankName: t.tankName,
            difference: t.difference
          }))
        });
        
        // Logiraj u SystemLog za administrativnu analizu
        await (tx as any).systemLog.create({
          data: {
            action: `FUEL_DATA_INCONSISTENCY_AFTER_OPERATION`,
            details: JSON.stringify({
              operationType,
              inconsistentTanks: postOpInconsistentTanks,
              timestamp: new Date()
            }),
            severity: LogSeverity.WARNING,
            userId: userId || null
          }
        });
      }
    }
    
    // Logiraj operaciju u SystemLog
    await (tx as any).systemLog.create({
      data: {
        action: `FUEL_OPERATION_${operationType.toUpperCase()}`,
        details: JSON.stringify({
          tankIds,
          initialStates: initialTankStates,
          finalStates: finalTankStates,
          quantityAffected: requestedQuantity,
          notes,
          timestamp: new Date()
        }),
        severity: LogSeverity.INFO,
        userId: userId || null
      }
    });
    
    return result;
  }, {
    maxRetries,
    logActivity: true,
    activityName: `Fuel operation: ${operationType}`,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
}
