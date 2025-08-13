import { initFuelSyncCronJobs } from './fuelSyncCronJob';
import { initWizzXmlInvoiceCron } from './wizzXmlInvoiceCron';

import { logger } from '../utils/logger';

/**
 * Inicijalizacija svih cron poslova
 */
export function initAllCronJobs(): void {
  logger.info("Inicijalizacija cron poslova...");

  // Inicijalizacija cron poslova za sinhronizaciju goriva
  initFuelSyncCronJobs();
  // initWizzXmlInvoiceCron(); // Privremeno obustavljen do dobijanja FTP kredencijala
  


  // Ovdje se mogu dodati inicijalizacije drugih cron poslova

  logger.info("Svi cron poslovi uspješno inicijalizirani.");
}
