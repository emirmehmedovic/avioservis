import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from './logger';

const prisma = new PrismaClient();

export interface DensityVariationResult {
  tankId: number;
  tankName: string;
  weightedAverageDensity: number;
  operationalDensity: number;
  densityVariation: number;
  volumeImpact: number; // Expected volume difference due to density change
  recommendedAction: 'ACCEPT' | 'WARN' | 'ADJUST';
  details: string;
}

export interface DensityReconciliationResult {
  tankId: number;
  tankName: string;
  beforeKg: number;
  afterKg: number;
  beforeLiters: number;
  afterLiters: number;
  adjustmentKg: number;
  adjustmentLiters: number;
  success: boolean;
  details: string;
}

/**
 * Izračunava weighted average density za tank na osnovu MRN zapisa
 */
export async function calculateWeightedAverageDensity(
  tankId: number,
  tx?: Prisma.TransactionClient
): Promise<{ density: number; totalKg: number; totalLiters: number; mrnCount: number }> {
  const client = tx || prisma;
  
  const mrnRecords = await client.tankFuelByCustoms.findMany({
    where: { 
      fixed_tank_id: tankId,
      remaining_quantity_kg: { gt: 0 }
    },
    select: {
      customs_declaration_number: true,
      remaining_quantity_kg: true,
      remaining_quantity_liters: true,
      density_at_intake: true
    }
  });

  let totalKg = new Decimal(0);
  let totalLiters = new Decimal(0);
  let validRecords = 0;

  for (const record of mrnRecords) {
    if (record.remaining_quantity_kg && record.remaining_quantity_liters) {
      totalKg = totalKg.plus(record.remaining_quantity_kg);
      totalLiters = totalLiters.plus(record.remaining_quantity_liters);
      validRecords++;
    }
  }

  const density = totalLiters.greaterThan(0) ? totalKg.div(totalLiters).toNumber() : 0.8;

  return {
    density,
    totalKg: totalKg.toNumber(),
    totalLiters: totalLiters.toNumber(),
    mrnCount: validRecords
  };
}

/**
 * Analizira uticaj promjene gustoće na volumen
 */
export function analyzeDensityVariation(
  weightedDensity: number,
  operationalDensity: number,
  quantityKg: number
): DensityVariationResult {
  const densityVariation = Math.abs(operationalDensity - weightedDensity);
  const variationPercent = (densityVariation / weightedDensity) * 100;
  
  // Izračunaj volumetrijsku razliku
  const expectedLitersWeighted = quantityKg / weightedDensity;
  const expectedLitersOperational = quantityKg / operationalDensity;
  const volumeImpact = Math.abs(expectedLitersOperational - expectedLitersWeighted);
  
  let recommendedAction: 'ACCEPT' | 'WARN' | 'ADJUST';
  let details: string;
  
  if (variationPercent <= 1.0) {
    recommendedAction = 'ACCEPT';
    details = `Mala varijacija gustoće (${variationPercent.toFixed(2)}%) - operacija može nastaviti`;
  } else if (variationPercent <= 3.0) {
    recommendedAction = 'WARN';
    details = `Umjerena varijacija gustoće (${variationPercent.toFixed(2)}%) - očekuje se volumetrijska razlika od ${volumeImpact.toFixed(1)}L`;
  } else {
    recommendedAction = 'ADJUST';
    details = `Značajna varijacija gustoće (${variationPercent.toFixed(2)}%) - preporučuje se prilagođavanje količina`;
  }

  return {
    tankId: 0, // Will be set by caller
    tankName: '', // Will be set by caller
    weightedAverageDensity: weightedDensity,
    operationalDensity: operationalDensity,
    densityVariation,
    volumeImpact,
    recommendedAction,
    details
  };
}

/**
 * Sinhronizuje tank quantities sa MRN zapisi
 */
export async function reconcileTankWithMrnRecords(
  tankId: number,
  tx?: Prisma.TransactionClient
): Promise<DensityReconciliationResult> {
  const client = tx || prisma;
  
  try {
    // Dohvati trenutne podatke o tanku
    const tank = await client.fixedStorageTanks.findUnique({
      where: { id: tankId },
      select: {
        id: true,
        tank_name: true,
        current_quantity_kg: true,
        current_quantity_liters: true
      }
    });

    if (!tank) {
      throw new Error(`Tank sa ID ${tankId} nije pronađen`);
    }

    // Izračunaj sume iz MRN zapisa
    const mrnRecords = await client.tankFuelByCustoms.findMany({
      where: { 
        fixed_tank_id: tankId,
        remaining_quantity_kg: { gt: 0 }
      }
    });

    const mrnSumKg = mrnRecords.reduce((sum, record) => {
      return sum.plus(record.remaining_quantity_kg || 0);
    }, new Decimal(0));

    const mrnSumLiters = mrnRecords.reduce((sum, record) => {
      return sum.plus(record.remaining_quantity_liters || 0);
    }, new Decimal(0));

    const beforeKg = Number(tank.current_quantity_kg);
    const beforeLiters = Number(tank.current_quantity_liters);
    const afterKg = mrnSumKg.toNumber();
    const afterLiters = mrnSumLiters.toNumber();

    // Update tank sa ispravnim podacima
    await client.fixedStorageTanks.update({
      where: { id: tankId },
      data: {
        current_quantity_kg: afterKg,
        current_quantity_liters: afterLiters
      }
    });

    logger.info(`Tank ${tank.tank_name} reconciled: KG ${beforeKg} → ${afterKg}, L ${beforeLiters} → ${afterLiters}`);

    return {
      tankId: tank.id,
      tankName: tank.tank_name,
      beforeKg,
      afterKg,
      beforeLiters,
      afterLiters,
      adjustmentKg: afterKg - beforeKg,
      adjustmentLiters: afterLiters - beforeLiters,
      success: true,
      details: `Successfully reconciled tank ${tank.tank_name} with MRN records`
    };

  } catch (error) {
    logger.error(`Error reconciling tank ${tankId}:`, error);
    return {
      tankId,
      tankName: 'Unknown',
      beforeKg: 0,
      afterKg: 0,
      beforeLiters: 0,
      afterLiters: 0,
      adjustmentKg: 0,
      adjustmentLiters: 0,
      success: false,
      details: `Failed to reconcile tank: ${error}`
    };
  }
}

/**
 * Periodična provjera i reconciliation svih tankova
 */
export async function performSystemWideDensityReconciliation(): Promise<DensityReconciliationResult[]> {
  try {
    // Dohvati sve aktivne tankove
    const tanks = await prisma.fixedStorageTanks.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    });

    const results: DensityReconciliationResult[] = [];

    for (const tank of tanks) {
      const result = await reconcileTankWithMrnRecords(tank.id);
      results.push(result);
    }

    logger.info(`Completed system-wide density reconciliation for ${tanks.length} tanks`);
    return results;

  } catch (error) {
    logger.error('Error in system-wide density reconciliation:', error);
    throw error;
  }
}

/**
 * Kreira detaljni izvještaj o density variations kroz sistem
 */
export async function generateDensityAnalysisReport(): Promise<{
  summary: {
    totalTanks: number;
    tanksWithIssues: number;
    totalVariationKg: number;
    avgDensityVariation: number;
  };
  tankDetails: Array<{
    tankId: number;
    tankName: string;
    currentKg: number;
    mrnSumKg: number;
    differenceKg: number;
    weightedDensity: number;
    inconsistencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}> {
  const tanks = await prisma.fixedStorageTanks.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      tank_name: true,
      current_quantity_kg: true
    }
  });

  const tankDetails = [];
  let totalVariationKg = 0;
  let tanksWithIssues = 0;
  let totalDensityVariation = 0;

  for (const tank of tanks) {
    const mrnRecords = await prisma.tankFuelByCustoms.findMany({
      where: { 
        fixed_tank_id: tank.id,
        remaining_quantity_kg: { gt: 0 }
      }
    });

    const mrnSumKg = mrnRecords.reduce((sum, record) => {
      return sum + Number(record.remaining_quantity_kg || 0);
    }, 0);

    const mrnSumLiters = mrnRecords.reduce((sum, record) => {
      return sum + Number(record.remaining_quantity_liters || 0);
    }, 0);

    const currentKg = Number(tank.current_quantity_kg);
    const differenceKg = Math.abs(currentKg - mrnSumKg);
    const weightedDensity = mrnSumLiters > 0 ? mrnSumKg / mrnSumLiters : 0.8;

    let inconsistencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (differenceKg < 50) {
      inconsistencyLevel = 'LOW';
    } else if (differenceKg < 500) {
      inconsistencyLevel = 'MEDIUM';
    } else {
      inconsistencyLevel = 'HIGH';
      tanksWithIssues++;
    }

    totalVariationKg += differenceKg;
    totalDensityVariation += Math.abs(weightedDensity - 0.8); // Assume 0.8 as baseline

    tankDetails.push({
      tankId: tank.id,
      tankName: tank.tank_name,
      currentKg,
      mrnSumKg,
      differenceKg,
      weightedDensity,
      inconsistencyLevel
    });
  }

  return {
    summary: {
      totalTanks: tanks.length,
      tanksWithIssues,
      totalVariationKg,
      avgDensityVariation: tanks.length > 0 ? totalDensityVariation / tanks.length : 0
    },
    tankDetails
  };
} 