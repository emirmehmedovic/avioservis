import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';
import { processExcessFuelExchange } from '../utils/excessFuelExchangeService';

const prisma = new PrismaClient();

// Default konfiguracija za cron job razmjene viška goriva
export interface ExcessFuelExchangeConfig {
  // Cron expression za zakazivanje razmjene, default je svaka 2 sata
  cronSchedule: string;
  // Da li je cron job omogućen
  enabled: boolean;
  // Minimalni višak u litrama potreban za pokretanje razmjene
  minExcessLiters: number;
  // Maksimalni broj mobilnih tankova za obradu u jednoj iteraciji
  batchSize: number;
}

// Učitavanje konfiguracije iz environment varijabli
export function loadExcessFuelExchangeConfig(): ExcessFuelExchangeConfig {
  return {
    cronSchedule: process.env.EXCESS_SWAP_CRON || '0 */2 * * *', // Default: svaka 2 sata
    enabled: process.env.EXCESS_SWAP_ENABLED !== 'false', // Default: omogućeno
    minExcessLiters: parseFloat(process.env.EXCESS_SWAP_MIN_LITERS || '0.1'),
    batchSize: parseInt(process.env.EXCESS_SWAP_BATCH_SIZE || '10', 10)
  };
}

// Trenutna konfiguracija
let currentConfig = loadExcessFuelExchangeConfig();

// Referenca na cron task
let excessSwapJob: cron.ScheduledTask | null = null;

/**
 * Glavni posao za provjeru i zamjenu viška goriva u mobilnim tankovima
 */
export async function checkAndProcessExcessFuel(): Promise<void> {
  const processId = uuid();
  logger.info(`[excessFuelExchange:${processId}] Početak provjere viška goriva u mobilnim tankovima`);
  
  try {
    // Pronađi mobilne tankove s viškom litara a manjkom kg (kg = 0 ili blizu 0)
    const mobileTanksWithExcess = await prisma.mobileTankCustoms.findMany({
      where: {
        remaining_quantity_liters: {
          gt: currentConfig.minExcessLiters // Mora imati barem minimalnu količinu litara
        },
        remaining_quantity_kg: {
          lte: 0.1 // Praktično 0 kg (uz malu toleranciju za zaokruživanje)
        }
      },
      select: {
        id: true,
        mobile_tank_id: true,
        customs_declaration_number: true,
        remaining_quantity_liters: true,
        remaining_quantity_kg: true
      },
      orderBy: {
        createdAt: 'asc' // FIFO pristup
      },
      take: currentConfig.batchSize // Ograniči broj zapisa za obradu
    });

    logger.info(`[excessFuelExchange:${processId}] Pronađeno ${mobileTanksWithExcess.length} zapisa s viškom goriva`);

    // Obradi svaki zapis
    for (const excessRecord of mobileTanksWithExcess) {
      const recordId = uuid();
      logger.info(
        `[excessFuelExchange:${processId}:${recordId}] Obrada viška: ${excessRecord.remaining_quantity_liters}L / ${excessRecord.remaining_quantity_kg}kg u mobilnom tanku ${excessRecord.mobile_tank_id}, MRN: ${excessRecord.customs_declaration_number}`
      );

      try {
        // Izvrši zamjenu viška goriva
        const result = await processExcessFuelExchange(
          excessRecord.mobile_tank_id,
          Number(excessRecord.remaining_quantity_liters), // excessLiters
          excessRecord.id, // sourceMrnId 
          excessRecord.customs_declaration_number, // sourceMrn
          null // sourceMrnDensity - null da bi servis sam dohvatio gustoću iz MRN zapisa
        );

        logger.info(
          `[excessFuelExchange:${processId}:${recordId}] Uspješna zamjena viška: ${result.transferredLiters}L iz mobilnog tanka ${excessRecord.mobile_tank_id} u fiksni tank ${result.targetFixedTankId}`
        );
      } catch (error) {
        logger.error(
          `[excessFuelExchange:${processId}:${recordId}] Greška prilikom zamjene viška za tank ${excessRecord.mobile_tank_id}, MRN ${excessRecord.customs_declaration_number}:`,
          error
        );
        // Nastaviti s drugim zapisima čak i ako jedan ne uspije
        continue;
      }
    }

    logger.info(`[excessFuelExchange:${processId}] Završena obrada viška goriva`);
  } catch (error) {
    logger.error(`[excessFuelExchange:${processId}] Glavna greška u job-u za razmjenu viška goriva:`, error);
  }
}

/**
 * Inicijalizira cron job za razmjenu viška goriva
 */
export function initExcessFuelExchangeJob(config?: Partial<ExcessFuelExchangeConfig>): void {
  // Ažuriraj konfiguraciju ako je dohvaćena
  if (config) {
    currentConfig = { ...currentConfig, ...config };
  }

  // Zaustavi postojeći job ako je aktivan
  stopExcessFuelExchangeJob();

  // Ako je job omogućen, pokreni ga
  if (currentConfig.enabled) {
    logger.info(`Zakazivanje job-a za razmjenu viška goriva: ${currentConfig.cronSchedule}`);
    
    excessSwapJob = cron.schedule(currentConfig.cronSchedule, () => {
      checkAndProcessExcessFuel().catch(error => {
        logger.error("Greška u cron job-u za razmjenu viška goriva:", error);
      });
    });
    
    logger.info('Cron job za razmjenu viška goriva uspješno inicijaliziran');
  } else {
    logger.warn('Cron job za razmjenu viška goriva je onemogućen u konfiguraciji');
  }
}

/**
 * Zaustavlja cron job za razmjenu viška goriva
 */
export function stopExcessFuelExchangeJob(): void {
  if (excessSwapJob) {
    excessSwapJob.stop();
    excessSwapJob = null;
    logger.info('Zaustavljen cron job za razmjenu viška goriva');
  }
}

/**
 * Ažurira konfiguraciju cron joba za razmjenu viška goriva
 */
export function updateExcessFuelExchangeConfig(config: Partial<ExcessFuelExchangeConfig>): void {
  stopExcessFuelExchangeJob();
  currentConfig = { ...currentConfig, ...config };
  initExcessFuelExchangeJob();
}
