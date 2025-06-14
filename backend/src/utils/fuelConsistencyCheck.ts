import { PrismaClient, Prisma } from '@prisma/client';

// Definiramo LogSeverity enum koji odgovara onome u Prisma shemi
enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}
import { logger } from '../utils/logger';
import { executeInTransaction } from './transactionUtils';

const prisma = new PrismaClient();

/**
 * Interfejs za rezultat provjere konzistentnosti tanka
 */
interface TankConsistencyResult {
  tankId: number;
  tankName: string;
  fuelType: string;
  currentQuantityInTank: number;
  sumOfMRNQuantities: number;
  difference: number;
  isConsistent: boolean;
  mrnBreakdown?: {
    mrn: string;
    quantity: number;
    date: Date;
  }[];
}

/**
 * Interfejs za rezultat provjere konzistentnosti svih tankova
 */
interface ConsistencyCheckResult {
  timestamp: Date;
  totalTanksChecked: number;
  consistentTanks: number;
  inconsistentTanks: number;
  inconsistentTankDetails: TankConsistencyResult[];
  totalDifference: number;
}

/**
 * Provjerava konzistentnost između ukupne količine goriva u fiksnom tanku
 * i sume količina po MRN zapisima u TankFuelByCustoms tabeli
 * 
 * @param tankId - ID fiksnog tanka za provjeru (opcionalno)
 * @param toleranceLiters - Tolerancija razlike u litrama (default: 0.01)
 * @param includeConsistentTanks - Da li uključiti konzistentne tankove u rezultat (default: false)
 * @param includeMRNBreakdown - Da li uključiti detaljan prikaz MRN zapisa za nekonzistentne tankove (default: false)
 * @returns Rezultat provjere konzistentnosti
 */
export async function checkTankConsistency(
  tankId?: number,
  toleranceLiters: number = 0.01,
  includeConsistentTanks: boolean = false,
  includeMRNBreakdown: boolean = false
): Promise<ConsistencyCheckResult> {
  try {
    // Početak mjerenja vremena izvršavanja
    const startTime = process.hrtime();
    
    // Dohvati sve fiksne tankove ili specifični tank
    const tanksQuery = tankId 
      ? prisma.fixedStorageTanks.findMany({ where: { id: tankId } })
      : prisma.fixedStorageTanks.findMany();
    
    const tanks = await tanksQuery;
    
    const results: TankConsistencyResult[] = [];
    let totalDifference = 0;
    let consistentTanks = 0;
    let inconsistentTanks = 0;
    
    // Provjeri svaki tank
    for (const tank of tanks) {
      // Dohvati sumu MRN zapisa za tank
      const mrnSum = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(remaining_quantity_liters), 0) as total
        FROM "TankFuelByCustoms"
        WHERE fixed_tank_id = ${tank.id}
      `;
      
      const mrnTotal = parseFloat(mrnSum[0].total.toString());
      const tankTotal = parseFloat(tank.current_quantity_liters.toString());
      const difference = Math.abs(tankTotal - mrnTotal);
      const isConsistent = difference <= toleranceLiters;
      
      // Ažuriraj brojače
      if (isConsistent) {
        consistentTanks++;
      } else {
        inconsistentTanks++;
        totalDifference += difference;
      }
      
      // Ako je tank nekonzistentan ili ako želimo uključiti sve tankove
      if (!isConsistent || includeConsistentTanks) {
        const tankResult: TankConsistencyResult = {
          tankId: tank.id,
          tankName: tank.tank_name || `Tank #${tank.id}`,
          fuelType: tank.fuel_type,
          currentQuantityInTank: tankTotal,
          sumOfMRNQuantities: mrnTotal,
          difference: tankTotal - mrnTotal, // Može biti negativno ako MRN pokazuje više
          isConsistent
        };
        
        // Ako želimo detaljan prikaz MRN zapisa i tank nije konzistentan
        if (includeMRNBreakdown && !isConsistent) {
          const mrnRecords = await prisma.tankFuelByCustoms.findMany({
            where: { fixed_tank_id: tank.id },
            select: {
              customs_declaration_number: true,
              remaining_quantity_liters: true,
              date_added: true
            },
            orderBy: { date_added: 'asc' }
          });
          
          tankResult.mrnBreakdown = mrnRecords.map(record => ({
            mrn: record.customs_declaration_number,
            quantity: Number(record.remaining_quantity_liters),
            date: record.date_added
          }));
        }
        
        results.push(tankResult);
      }
    }
    
    // Kraj mjerenja vremena izvršavanja
    const endTime = process.hrtime(startTime);
    const executionTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
    
    // Logiraj rezultate provjere
    logger.info(`Provjera konzistentnosti završena za ${tanks.length} tankova u ${executionTimeMs}ms. Nekonzistentnih: ${inconsistentTanks}`);
    
    if (inconsistentTanks > 0) {
      logger.warn(`Detektirano ${inconsistentTanks} nekonzistentnih tankova s ukupnom razlikom od ${totalDifference.toFixed(2)}L`);
      
      // Logiraj detalje za svaki nekonzistentan tank
      results.filter(r => !r.isConsistent).forEach(tank => {
        logger.warn(`Tank #${tank.tankId} (${tank.tankName}): Razlika ${tank.difference.toFixed(2)}L. Tank: ${tank.currentQuantityInTank}L, MRN suma: ${tank.sumOfMRNQuantities}L`);
      });
    }
    
    return {
      timestamp: new Date(),
      totalTanksChecked: tanks.length,
      consistentTanks,
      inconsistentTanks,
      inconsistentTankDetails: results.filter(r => !r.isConsistent),
      totalDifference
    };
  } catch (error) {
    logger.error('Greška prilikom provjere konzistentnosti tankova:', error);
    throw new Error(`Greška prilikom provjere konzistentnosti: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
  }
}

/**
 * Logira rezultate provjere konzistentnosti u tabelu system_logs
 */
export async function logConsistencyCheckResult(result: ConsistencyCheckResult): Promise<void> {
  try {
    await executeInTransaction(async (tx) => {
      await (tx as any).systemLog.create({
        data: {
          action: 'FUEL_CONSISTENCY_CHECK',
          details: JSON.stringify({
            timestamp: result.timestamp,
            totalTanksChecked: result.totalTanksChecked,
            consistentTanks: result.consistentTanks,
            inconsistentTanks: result.inconsistentTanks,
            totalDifference: result.totalDifference,
            inconsistentTankIds: result.inconsistentTankDetails.map(t => t.tankId)
          }),
          severity: result.inconsistentTanks > 0 ? 'WARNING' as LogSeverity : 'INFO' as LogSeverity,
          userId: null // Sistemska akcija
        }
      });

      // Ako ima nekonzistentnih tankova, logiraj detalje za svaki
      if (result.inconsistentTanks > 0) {
        for (const tank of result.inconsistentTankDetails) {
          await (tx as any).systemLog.create({
            data: {
              action: 'TANK_INCONSISTENCY_DETECTED',
              details: JSON.stringify({
                tankId: tank.tankId,
                tankName: tank.tankName,
                fuelType: tank.fuelType,
                currentQuantityInTank: tank.currentQuantityInTank,
                sumOfMRNQuantities: tank.sumOfMRNQuantities,
                difference: tank.difference,
                timestamp: result.timestamp
              }),
              severity: 'WARNING' as LogSeverity,
              userId: null // Sistemska akcija
            }
          });
        }
      }
    });
    logger.info(`Rezultati provjere konzistentnosti uspješno logirani u sistemski log`);
  } catch (error) {
    logger.error('Greška prilikom logiranja rezultata provjere konzistentnosti:', error);
  }
}

/**
 * Izvršava provjeru konzistentnosti i logira rezultate
 * 
 * @param tankId - ID fiksnog tanka za provjeru (opcionalno)
 * @param toleranceLiters - Tolerancija razlike u litrama (default: 0.01)
 * @returns Rezultat provjere konzistentnosti
 */
export async function runConsistencyCheck(
  tankId?: number,
  toleranceLiters: number = 0.01
): Promise<ConsistencyCheckResult> {
  const result = await checkTankConsistency(tankId, toleranceLiters, false, true);
  await logConsistencyCheckResult(result);
  return result;
}
