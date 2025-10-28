import { initFuelSyncCronJobs } from './fuelSyncCronJob';
import { initWizzXmlInvoiceCron } from './wizzXmlInvoiceCron';
import { initPaymentStatusCron } from './paymentStatusCron';
import { initEmailInvoiceCron } from './emailInvoiceCron';
import { initEmailPaymentStatusCron } from './emailPaymentStatusCron';
import { initExpirationNotificationCron } from './expirationNotificationCron';
import { initTestCron } from './testCron';

import { logger } from '../utils/logger';

/**
 * Inicijalizacija svih cron poslova
 */
export function initAllCronJobs(): void {
  logger.info("Inicijalizacija cron poslova...");

  // Inicijalizacija cron poslova za sinhronizaciju goriva
  initFuelSyncCronJobs();
  initWizzXmlInvoiceCron(); // Omogućen sa SFTP kredencijalima
  initPaymentStatusCron(); // Automatsko ažuriranje payment statusa (XML)
  initEmailInvoiceCron(); // Automatsko slanje email faktura
  initEmailPaymentStatusCron(); // Automatsko ažuriranje payment statusa (Email)
  initExpirationNotificationCron(); // Automatska provera datuma isteka
  
  // Test cron - za dijagnostiku (00:15 + svake 2 minute)
  initTestCron();

  // Ovdje se mogu dodati inicijalizacije drugih cron poslova

  logger.info("Svi cron poslovi uspješno inicijalizirani.");
}
