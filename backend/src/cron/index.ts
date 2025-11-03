import { initFuelSyncCronJobs } from './fuelSyncCronJob';
import { initWizzXmlInvoiceCron } from './wizzXmlInvoiceCron';
import { initPaymentStatusCron } from './paymentStatusCron';
import { initEmailInvoiceCron } from './emailInvoiceCron';
import { initEmailPaymentStatusCron } from './emailPaymentStatusCron';
import { initExpirationNotificationCron } from './expirationNotificationCron';

/**
 * Inicijalizacija svih cron poslova
 */
export function initAllCronJobs(): void {
  console.log("Inicijalizacija cron poslova...");

  const cronJobs = [
    { name: 'Fuel Sync CRON', fn: initFuelSyncCronJobs },
    { name: 'Wizz XML Invoice CRON', fn: initWizzXmlInvoiceCron },
    { name: 'Payment Status CRON', fn: initPaymentStatusCron },
    { name: 'Email Invoice CRON', fn: initEmailInvoiceCron },
    { name: 'Email Payment Status CRON', fn: initEmailPaymentStatusCron },
    { name: 'Expiration Notification CRON', fn: initExpirationNotificationCron }
  ];

  let successCount = 0;
  let failureCount = 0;
  const failures: string[] = [];

  for (const job of cronJobs) {
    try {
      console.log(`[${new Date().toISOString()}] Inicijalizacija ${job.name}...`);
      job.fn();
      successCount++;
      console.log(`[${new Date().toISOString()}] ✅ ${job.name} uspješno inicijalizovan`);
    } catch (error: any) {
      failureCount++;
      const errorMsg = error?.message || String(error);
      failures.push(`${job.name}: ${errorMsg}`);
      console.error(`[${new Date().toISOString()}] ❌ GREŠKA pri inicijalizaciji ${job.name}:`, errorMsg);
      console.error(`[${new Date().toISOString()}] Stack:`, error?.stack || 'No stack available');
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`[${new Date().toISOString()}] STATISTIKA INICIJALIZACIJE CRON POSLOVA`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`Uspješno inicijalizirani: ${successCount}/${cronJobs.length}`);
  console.log(`Greške: ${failureCount}/${cronJobs.length}`);

  if (failures.length > 0) {
    console.error('Neuspješne inicijalizacije:');
    failures.forEach(f => console.error(`  - ${f}`));
    console.error(`[${new Date().toISOString()}] ⚠️ UPOZORENJE: Samo ${successCount} od ${cronJobs.length} cron poslova je inicijalizirano!`);
  } else {
    console.log('✅ Svi cron poslovi uspješno inicijalizirani.');
  }
  console.log('═══════════════════════════════════════════════════');
  console.log('');
}
