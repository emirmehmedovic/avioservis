import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Konfiguracija threshold-ova za cleanup
export const MRN_CLEANUP_CONFIG = {
  // Agresivniji threshold - sve ispod 2L ili 1.5kg se smatra "dust"
  LITERS_THRESHOLD: 2.0,
  KG_THRESHOLD: 1.5,
  
  // Ultra mali ostatci se uvek čiste
  DUST_LITERS_THRESHOLD: 0.5,
  DUST_KG_THRESHOLD: 0.3,
  
  // Consolidation - spoji ostatke u "MISC" MRN ako su ispod 5L
  CONSOLIDATION_THRESHOLD: 5.0
};

/**
 * Interface za cleanup rezultat
 */
export interface MrnCleanupResult {
  cleanedRecords: Array<{
    id: number;
    mrn: string;
    originalLiters: number;
    originalKg: number;
    action: 'CLEANED' | 'CONSOLIDATED' | 'KEPT';
  }>;
  consolidatedIntoMisc: boolean;
  totalCleanedLiters: number;
  totalCleanedKg: number;
}

/**
 * Čisti male ostatke MRN-ova iz fiksnog tanka
 */
export async function cleanupFixedTankMrnRemnants(
  tx: Prisma.TransactionClient,
  tankId: number,
  operationType: string = 'CLEANUP'
): Promise<MrnCleanupResult> {
  logger.info(`🧹 Starting MRN cleanup for fixed tank ${tankId} (operation: ${operationType})`);
  
  // Dohvati sve MRN zapise za ovaj tank
  const mrnRecords = await tx.tankFuelByCustoms.findMany({
    where: {
      fixed_tank_id: tankId,
      remaining_quantity_kg: { gt: 0 }
    },
    orderBy: { date_added: 'asc' }
  });
  
  const result: MrnCleanupResult = {
    cleanedRecords: [],
    consolidatedIntoMisc: false,
    totalCleanedLiters: 0,
    totalCleanedKg: 0
  };
  
  const dustRecords = [];
  const smallRecords = [];
  
  // Kategoriši zapise po veličini
  for (const record of mrnRecords) {
    const liters = Number(record.remaining_quantity_liters);
    const kg = Number(record.remaining_quantity_kg);
    
    if (liters <= MRN_CLEANUP_CONFIG.DUST_LITERS_THRESHOLD || 
        kg <= MRN_CLEANUP_CONFIG.DUST_KG_THRESHOLD) {
      dustRecords.push(record);
    } else if (liters <= MRN_CLEANUP_CONFIG.LITERS_THRESHOLD || 
               kg <= MRN_CLEANUP_CONFIG.KG_THRESHOLD) {
      smallRecords.push(record);
    }
  }
  
  // 1. OČISTI "DUST" zapise (ispod 0.5L/0.3kg)
  for (const record of dustRecords) {
    logger.info(`🗑️  CLEANING DUST: MRN ${record.customs_declaration_number} - ${Number(record.remaining_quantity_liters).toFixed(3)}L / ${Number(record.remaining_quantity_kg).toFixed(3)}kg`);
    
    await tx.tankFuelByCustoms.update({
      where: { id: record.id },
      data: {
        remaining_quantity_liters: 0,
        remaining_quantity_kg: 0
      }
    });
    
    result.cleanedRecords.push({
      id: record.id,
      mrn: record.customs_declaration_number,
      originalLiters: Number(record.remaining_quantity_liters),
      originalKg: Number(record.remaining_quantity_kg),
      action: 'CLEANED'
    });
    
    result.totalCleanedLiters += Number(record.remaining_quantity_liters);
    result.totalCleanedKg += Number(record.remaining_quantity_kg);
  }
  
  // 2. CONSOLIDACIJA malih zapisa (2-5L)
  if (smallRecords.length > 1) {
    const totalConsolidationLiters = smallRecords.reduce((sum, r) => sum + Number(r.remaining_quantity_liters), 0);
    const totalConsolidationKg = smallRecords.reduce((sum, r) => sum + Number(r.remaining_quantity_kg), 0);
    
    if (totalConsolidationLiters <= MRN_CLEANUP_CONFIG.CONSOLIDATION_THRESHOLD) {
      logger.info(`🔄 CONSOLIDATING ${smallRecords.length} small MRN records into MISC (total: ${totalConsolidationLiters.toFixed(3)}L)`);
      
      // Kreiraj MISC MRN zapis
      const miscMrn = `MISC-TANK-${tankId}-${Date.now()}`;
      const avgDensity = totalConsolidationKg / totalConsolidationLiters;
      
      await tx.tankFuelByCustoms.create({
        data: {
          fixed_tank_id: tankId,
          fuel_intake_record_id: smallRecords[0].fuel_intake_record_id, // Koristi prvi kao parent
          customs_declaration_number: miscMrn,
          quantity_liters: totalConsolidationLiters,
          remaining_quantity_liters: totalConsolidationLiters,
          quantity_kg: totalConsolidationKg,
          remaining_quantity_kg: totalConsolidationKg,
          density_at_intake: avgDensity,
          date_added: new Date()
        }
      });
      
      // Obriši originale
      for (const record of smallRecords) {
        await tx.tankFuelByCustoms.update({
          where: { id: record.id },
          data: {
            remaining_quantity_liters: 0,
            remaining_quantity_kg: 0
          }
        });
        
        result.cleanedRecords.push({
          id: record.id,
          mrn: record.customs_declaration_number,
          originalLiters: Number(record.remaining_quantity_liters),
          originalKg: Number(record.remaining_quantity_kg),
          action: 'CONSOLIDATED'
        });
      }
      
      result.consolidatedIntoMisc = true;
      logger.info(`✅ Created MISC MRN: ${miscMrn} with ${totalConsolidationLiters.toFixed(3)}L / ${totalConsolidationKg.toFixed(3)}kg`);
    }
  }
  
  logger.info(`🏁 MRN cleanup completed for tank ${tankId}: cleaned ${result.cleanedRecords.length} records, total: ${result.totalCleanedLiters.toFixed(3)}L / ${result.totalCleanedKg.toFixed(3)}kg`);
  
  return result;
}

/**
 * Čisti male ostatke MRN-ova iz mobilnog tanka
 */
export async function cleanupMobileTankMrnRemnants(
  tx: Prisma.TransactionClient,
  tankId: number,
  operationType: string = 'CLEANUP'
): Promise<MrnCleanupResult> {
  logger.info(`🧹 Starting MRN cleanup for mobile tank ${tankId} (operation: ${operationType})`);
  
  const mrnRecords = await tx.mobileTankCustoms.findMany({
    where: {
      mobile_tank_id: tankId,
      remaining_quantity_kg: { gt: 0 }
    },
    orderBy: { date_added: 'asc' }
  });
  
  const result: MrnCleanupResult = {
    cleanedRecords: [],
    consolidatedIntoMisc: false,
    totalCleanedLiters: 0,
    totalCleanedKg: 0
  };
  
  // Za mobilne tankove, samo agresivno čišćenje (bez consolidacije)
  for (const record of mrnRecords) {
    const liters = Number(record.remaining_quantity_liters);
    const kg = Number(record.remaining_quantity_kg);
    
    if (liters <= MRN_CLEANUP_CONFIG.LITERS_THRESHOLD || 
        kg <= MRN_CLEANUP_CONFIG.KG_THRESHOLD) {
      logger.info(`🗑️  CLEANING: MRN ${record.customs_declaration_number} - ${liters.toFixed(3)}L / ${kg.toFixed(3)}kg`);
      
      await tx.mobileTankCustoms.update({
        where: { id: record.id },
        data: {
          remaining_quantity_liters: 0,
          remaining_quantity_kg: 0
        }
      });
      
      result.cleanedRecords.push({
        id: record.id,
        mrn: record.customs_declaration_number,
        originalLiters: liters,
        originalKg: kg,
        action: 'CLEANED'
      });
      
      result.totalCleanedLiters += liters;
      result.totalCleanedKg += kg;
    }
  }
  
  logger.info(`🏁 Mobile tank MRN cleanup completed: cleaned ${result.cleanedRecords.length} records`);
  
  return result;
}

/**
 * Provjeri da li MRN zapis treba biti očišćen na osnovu threshold-a
 */
export function shouldCleanupMrnRecord(liters: number, kg: number): boolean {
  return liters <= MRN_CLEANUP_CONFIG.LITERS_THRESHOLD || 
         kg <= MRN_CLEANUP_CONFIG.KG_THRESHOLD;
}

/**
 * Wrapper funkcija za poziv iz postojećih kontrolera
 */
export async function performMrnCleanupIfNeeded(
  tx: Prisma.TransactionClient,
  tankId: number,
  tankType: 'fixed' | 'mobile',
  operationType: string
): Promise<void> {
  try {
    if (tankType === 'fixed') {
      await cleanupFixedTankMrnRemnants(tx, tankId, operationType);
    } else {
      await cleanupMobileTankMrnRemnants(tx, tankId, operationType);
    }
  } catch (error) {
    logger.warn(`MRN cleanup failed for ${tankType} tank ${tankId}:`, error);
    // Ne prekidamo operaciju zbog cleanup greške
  }
} 