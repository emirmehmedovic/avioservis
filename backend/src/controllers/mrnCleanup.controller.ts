import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { 
  cleanupFixedTankMrnRemnants, 
  cleanupMobileTankMrnRemnants,
  MRN_CLEANUP_CONFIG,
  performMrnCleanupIfNeeded 
} from '../services/mrnCleanupService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Manual cleanup for specific fixed tank
 */
export const cleanupFixedTank = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tankId } = req.params;
  
  if (!tankId || isNaN(Number(tankId))) {
    res.status(400).json({ 
      success: false, 
      message: 'Valid tank ID is required' 
    });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return await cleanupFixedTankMrnRemnants(tx, Number(tankId), 'MANUAL_CLEANUP');
    });
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Fixed tank ${tankId} cleanup completed. Cleaned ${result.cleanedRecords.length} records, total: ${result.totalCleanedLiters.toFixed(3)}L / ${result.totalCleanedKg.toFixed(3)}kg`
    });
  } catch (error) {
    logger.error(`Failed to cleanup fixed tank ${tankId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'MRN cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Manual cleanup for specific mobile tank
 */
export const cleanupMobileTank = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tankId } = req.params;
  
  if (!tankId || isNaN(Number(tankId))) {
    res.status(400).json({ 
      success: false, 
      message: 'Valid tank ID is required' 
    });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return await cleanupMobileTankMrnRemnants(tx, Number(tankId), 'MANUAL_CLEANUP');
    });
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Mobile tank ${tankId} cleanup completed. Cleaned ${result.cleanedRecords.length} records, total: ${result.totalCleanedLiters.toFixed(3)}L / ${result.totalCleanedKg.toFixed(3)}kg`
    });
  } catch (error) {
    logger.error(`Failed to cleanup mobile tank ${tankId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'MRN cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * System-wide cleanup for all tanks
 */
export const cleanupAllTanks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('🧹 Starting system-wide MRN cleanup...');
    
    // Get all fixed tanks
    const fixedTanks = await prisma.fixedStorageTanks.findMany({
      select: { id: true, tank_name: true }
    });
    
    // Get all mobile tanks (fuel tanks)
    const mobileTanks = await prisma.fuelTank.findMany({
      where: { is_deleted: false },
      select: { id: true, name: true }
    });
    
    const results: {
      fixedTanks: Array<{
        tankId: number;
        tankName: string;
        cleanedRecords: number;
        cleanedLiters: number;
        cleanedKg: number;
        consolidated: boolean;
      }>;
      mobileTanks: Array<{
        tankId: number;
        tankName: string;
        cleanedRecords: number;
        cleanedLiters: number;
        cleanedKg: number;
      }>;
      totalCleaned: number;
      totalCleanedLiters: number;
      totalCleanedKg: number;
    } = {
      fixedTanks: [],
      mobileTanks: [],
      totalCleaned: 0,
      totalCleanedLiters: 0,
      totalCleanedKg: 0
    };
    
    // Cleanup fixed tanks
    for (const tank of fixedTanks) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          return await cleanupFixedTankMrnRemnants(tx, tank.id, 'SYSTEM_WIDE_CLEANUP');
        });
        
        if (result.cleanedRecords.length > 0) {
          results.fixedTanks.push({
            tankId: tank.id,
            tankName: tank.tank_name,
            cleanedRecords: result.cleanedRecords.length,
            cleanedLiters: result.totalCleanedLiters,
            cleanedKg: result.totalCleanedKg,
            consolidated: result.consolidatedIntoMisc
          });
          
          results.totalCleaned += result.cleanedRecords.length;
          results.totalCleanedLiters += result.totalCleanedLiters;
          results.totalCleanedKg += result.totalCleanedKg;
        }
      } catch (error) {
        logger.warn(`Failed to cleanup fixed tank ${tank.id} (${tank.tank_name}):`, error);
      }
    }
    
    // Cleanup mobile tanks
    for (const tank of mobileTanks) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          return await cleanupMobileTankMrnRemnants(tx, tank.id, 'SYSTEM_WIDE_CLEANUP');
        });
        
        if (result.cleanedRecords.length > 0) {
          results.mobileTanks.push({
            tankId: tank.id,
            tankName: tank.name,
            cleanedRecords: result.cleanedRecords.length,
            cleanedLiters: result.totalCleanedLiters,
            cleanedKg: result.totalCleanedKg
          });
          
          results.totalCleaned += result.cleanedRecords.length;
          results.totalCleanedLiters += result.totalCleanedLiters;
          results.totalCleanedKg += result.totalCleanedKg;
        }
      } catch (error) {
        logger.warn(`Failed to cleanup mobile tank ${tank.id} (${tank.name}):`, error);
      }
    }
    
    logger.info(`🏁 System-wide cleanup completed: ${results.totalCleaned} records cleaned, ${results.totalCleanedLiters.toFixed(3)}L / ${results.totalCleanedKg.toFixed(3)}kg total`);
    
    res.status(200).json({
      success: true,
      data: results,
      message: `System-wide cleanup completed. Cleaned ${results.totalCleaned} MRN records, total: ${results.totalCleanedLiters.toFixed(3)}L / ${results.totalCleanedKg.toFixed(3)}kg`
    });
    
  } catch (error) {
    logger.error('System-wide cleanup failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'System-wide MRN cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get cleanup configuration and statistics
 */
export const getCleanupInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get count of small MRN records that would be cleaned
    const fixedTankSmallRecords = await prisma.tankFuelByCustoms.count({
      where: {
        remaining_quantity_kg: { gt: 0, lte: MRN_CLEANUP_CONFIG.KG_THRESHOLD },
        OR: [
          { remaining_quantity_liters: { lte: MRN_CLEANUP_CONFIG.LITERS_THRESHOLD } },
          { remaining_quantity_kg: { lte: MRN_CLEANUP_CONFIG.KG_THRESHOLD } }
        ]
      }
    });
    
    const mobileTankSmallRecords = await prisma.mobileTankCustoms.count({
      where: {
        remaining_quantity_kg: { gt: 0, lte: MRN_CLEANUP_CONFIG.KG_THRESHOLD },
        OR: [
          { remaining_quantity_liters: { lte: MRN_CLEANUP_CONFIG.LITERS_THRESHOLD } },
          { remaining_quantity_kg: { lte: MRN_CLEANUP_CONFIG.KG_THRESHOLD } }
        ]
      }
    });
    
    // Get count of dust records
    const fixedTankDustRecords = await prisma.tankFuelByCustoms.count({
      where: {
        remaining_quantity_kg: { gt: 0, lte: MRN_CLEANUP_CONFIG.DUST_KG_THRESHOLD },
        OR: [
          { remaining_quantity_liters: { lte: MRN_CLEANUP_CONFIG.DUST_LITERS_THRESHOLD } },
          { remaining_quantity_kg: { lte: MRN_CLEANUP_CONFIG.DUST_KG_THRESHOLD } }
        ]
      }
    });
    
    const mobileTankDustRecords = await prisma.mobileTankCustoms.count({
      where: {
        remaining_quantity_kg: { gt: 0, lte: MRN_CLEANUP_CONFIG.DUST_KG_THRESHOLD },
        OR: [
          { remaining_quantity_liters: { lte: MRN_CLEANUP_CONFIG.DUST_LITERS_THRESHOLD } },
          { remaining_quantity_kg: { lte: MRN_CLEANUP_CONFIG.DUST_KG_THRESHOLD } }
        ]
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        config: MRN_CLEANUP_CONFIG,
        statistics: {
          fixedTanks: {
            smallRecords: fixedTankSmallRecords,
            dustRecords: fixedTankDustRecords
          },
          mobileTanks: {
            smallRecords: mobileTankSmallRecords,
            dustRecords: mobileTankDustRecords
          },
          total: {
            smallRecords: fixedTankSmallRecords + mobileTankSmallRecords,
            dustRecords: fixedTankDustRecords + mobileTankDustRecords
          }
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get cleanup info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get cleanup information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 