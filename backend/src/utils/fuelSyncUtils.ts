import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { verifyTankConsistency, TankConsistencyResult } from './fuelConsistencyUtils';

// Definiramo LogSeverity enum koji odgovara onome u Prisma shemi
enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Prošireni tip za Prisma transakcijski klijent koji uključuje SystemLog model
type ExtendedTransactionClient = Omit<Prisma.TransactionClient, 'systemLog'> & {
  systemLog: {
    create: (args: {
      data: {
        action: string;
        details: string;
        severity?: string;
        userId?: number | null;
      };
    }) => Promise<any>;
  };
};

const prisma = new PrismaClient();

/**
 * Strategije za sinhronizaciju nekonzistentnih podataka goriva
 */
export enum SyncStrategy {
  // Prilagodi MRN zapise da odgovaraju ukupnoj količini goriva u tanku
  ADJUST_MRN_RECORDS = 'ADJUST_MRN_RECORDS',
  
  // Prilagodi ukupnu količinu goriva u tanku da odgovara sumi MRN zapisa
  ADJUST_TANK_QUANTITY = 'ADJUST_TANK_QUANTITY',
  
  // Samo izvijesti o nekonzistentnostima, bez prilagodbi
  REPORT_ONLY = 'REPORT_ONLY'
}

/**
 * Rezultat sinhronizacije podataka o gorivu
 */
interface SyncResult {
  tankId: number;
  tankName: string;
  wasConsistent: boolean;
  initialState: {
    tankQuantity: number;
    mrnTotalQuantity: number;
    difference: number;
  };
  finalState?: {
    tankQuantity: number;
    mrnTotalQuantity: number;
    difference: number;
  };
  strategy: SyncStrategy;
  adjustments?: {
    tankAdjusted?: boolean;
    tankAdjustmentAmount?: number;
    mrnAdjustments?: Array<{
      mrnId: number;
      customsDeclarationNumber: string;
      previousQuantity: number;
      newQuantity: number;
      difference: number;
    }>;
  };
}

/**
 * Sinhronizira podatke o gorivu u tanku s MRN zapisima
 * 
 * @param tankId ID tanka za sinhronizaciju
 * @param strategy Strategija za sinhronizaciju
 * @param userId ID korisnika koji izvršava sinhronizaciju
 * @returns Rezultat sinhronizacije
 */
export async function syncTankFuelData(
  tankId: number,
  strategy: SyncStrategy = SyncStrategy.REPORT_ONLY,
  userId?: number
): Promise<SyncResult> {
  // Prvo provjeri konzistentnost tanka
  const consistencyResult = await verifyTankConsistency(tankId);
  
  // Ako je tank konzistentan, nema potrebe za sinhronizacijom
  if (consistencyResult.isConsistent) {
    logger.info(`Tank ${consistencyResult.tankName} (ID: ${tankId}) je već konzistentan, sinhronizacija nije potrebna.`);
    return {
      tankId: consistencyResult.tankId,
      tankName: consistencyResult.tankName,
      wasConsistent: true,
      initialState: {
        tankQuantity: consistencyResult.currentQuantityLiters,
        mrnTotalQuantity: consistencyResult.sumMrnQuantities,
        difference: consistencyResult.difference
      },
      strategy
    };
  }
  
  // Log početka sinhronizacije
  logger.info(`Započinjem sinhronizaciju tanka ${consistencyResult.tankName} (ID: ${tankId}) koristeći strategiju ${strategy}`);
  
  const result: SyncResult = {
    tankId: consistencyResult.tankId,
    tankName: consistencyResult.tankName,
    wasConsistent: false,
    initialState: {
      tankQuantity: consistencyResult.currentQuantityLiters,
      mrnTotalQuantity: consistencyResult.sumMrnQuantities,
      difference: consistencyResult.difference
    },
    strategy,
    adjustments: {
      mrnAdjustments: []
    }
  };
  
  // Ako je strategija samo izvještavanje, nemoj vršiti prilagodbe
  if (strategy === SyncStrategy.REPORT_ONLY) {
    logger.info(`Strategija REPORT_ONLY, bez prilagodbi za tank ${consistencyResult.tankName} (ID: ${tankId})`);
    return result;
  }
  
  // Izvrši sinhronizaciju unutar transakcije
  try {
    await prisma.$transaction(async (tx: any) => {
      if (strategy === SyncStrategy.ADJUST_TANK_QUANTITY) {
        // Prilagodi količinu goriva u tanku da odgovara sumi MRN zapisa
        const updatedTank = await tx.fixedStorageTanks.update({
          where: { id: tankId },
          data: {
            current_quantity_liters: consistencyResult.sumMrnQuantities
          }
        });
        
        result.adjustments!.tankAdjusted = true;
        result.adjustments!.tankAdjustmentAmount = 
          consistencyResult.sumMrnQuantities - consistencyResult.currentQuantityLiters;
        
        logger.info(`Prilagođena količina tanka ${consistencyResult.tankName} (ID: ${tankId}): ${consistencyResult.currentQuantityLiters} L -> ${consistencyResult.sumMrnQuantities} L`);
        
        // Logiraj sinhronizaciju u SystemLog
        await (tx as ExtendedTransactionClient).systemLog.create({
          data: {
            action: 'FUEL_DATA_SYNC',
            details: JSON.stringify({
              tankId,
              strategy,
              initialTankQuantity: consistencyResult.currentQuantityLiters,
              newTankQuantity: consistencyResult.sumMrnQuantities,
              adjustment: result.adjustments!.tankAdjustmentAmount,
              timestamp: new Date()
            }),
            severity: LogSeverity.INFO,
            userId: userId || null
          }
        });
      } else if (strategy === SyncStrategy.ADJUST_MRN_RECORDS) {
        // Prilagodi MRN zapise da odgovaraju ukupnoj količini u tanku
        // Ova strategija je kompleksnija jer treba odlučiti koji MRN zapisi se prilagođavaju
        
        // Dohvati MRN zapise sortirane po datumu, najnoviji prvi
        const mrnRecords = await tx.tankFuelByCustoms.findMany({
          where: { fixed_tank_id: tankId },
          orderBy: { date_added: 'desc' }
        });
        
        // Izračunaj koliko treba prilagoditi (negativno: smanjiti, pozitivno: povećati)
        let adjustmentNeeded = consistencyResult.currentQuantityLiters - consistencyResult.sumMrnQuantities;
        
        // Prilagodi MRN zapise počevši od najnovijih
        for (const record of mrnRecords) {
          if (Math.abs(adjustmentNeeded) < 0.001) break; // Završili smo s prilagodbama
          
          const previousQuantity = record.remaining_quantity_liters;
          let newQuantity = previousQuantity;
          
          if (adjustmentNeeded > 0) {
            // Treba povećati MRN zapis
            newQuantity = previousQuantity + adjustmentNeeded;
            adjustmentNeeded = 0; // Sav višak dodajemo na najnoviji zapis
          } else {
            // Treba smanjiti MRN zapis
            newQuantity = Math.max(0, previousQuantity + adjustmentNeeded);
            adjustmentNeeded += (newQuantity - previousQuantity); // Ažuriraj preostalo za prilagodbu
          }
          
          // Ažuriraj MRN zapis
          await tx.tankFuelByCustoms.update({
            where: { id: record.id },
            data: { remaining_quantity_liters: newQuantity }
          });
          
          // Dodaj u rezultat
          result.adjustments!.mrnAdjustments!.push({
            mrnId: record.id,
            customsDeclarationNumber: record.customs_declaration_number,
            previousQuantity,
            newQuantity,
            difference: newQuantity - previousQuantity
          });
          
          logger.info(`Prilagođen MRN zapis ${record.customs_declaration_number}: ${previousQuantity} L -> ${newQuantity} L`);
        }
        
        // Logiraj sinhronizaciju u SystemLog
        await (tx as ExtendedTransactionClient).systemLog.create({
          data: {
            action: 'FUEL_DATA_SYNC',
            details: JSON.stringify({
              tankId,
              strategy,
              mrnAdjustments: result.adjustments!.mrnAdjustments,
              timestamp: new Date()
            }),
            severity: LogSeverity.INFO,
            userId: userId || null
          }
        });
      }
      
      // Dohvati finalno stanje nakon prilagodbi
      const finalConsistencyResult = await verifyTankConsistency(tankId, tx);
      result.finalState = {
        tankQuantity: finalConsistencyResult.currentQuantityLiters,
        mrnTotalQuantity: finalConsistencyResult.sumMrnQuantities,
        difference: finalConsistencyResult.difference
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
    
    logger.info(`Sinhronizacija tanka ${result.tankName} (ID: ${tankId}) uspješno završena.`);
    return result;
    
  } catch (error) {
    logger.error(`Greška prilikom sinhronizacije tanka ${result.tankName} (ID: ${tankId}):`, error);
    throw error;
  }
}

/**
 * Sinhronizira podatke o gorivu za sve tankove
 * 
 * @param strategy Strategija za sinhronizaciju
 * @param userId ID korisnika koji izvršava sinhronizaciju
 * @returns Rezultati sinhronizacije za sve tankove
 */
export async function syncAllTanksFuelData(
  strategy: SyncStrategy = SyncStrategy.REPORT_ONLY,
  userId?: number
): Promise<SyncResult[]> {
  // Dohvati sve fiksne tankove
  const tanks = await prisma.fixedStorageTanks.findMany({
    select: {
      id: true,
      tank_name: true
    }
  });
  
  logger.info(`Započinjem sinhronizaciju za ${tanks.length} tankova koristeći strategiju ${strategy}`);
  
  // Izvrši sinhronizaciju za svaki tank
  const results: SyncResult[] = [];
  for (const tank of tanks) {
    try {
      const result = await syncTankFuelData(tank.id, strategy, userId);
      results.push(result);
    } catch (error) {
      logger.error(`Greška prilikom sinhronizacije tanka ${tank.tank_name} (ID: ${tank.id}):`, error);
      // Nastavi s ostalim tankovima
    }
  }
  
  return results;
}
