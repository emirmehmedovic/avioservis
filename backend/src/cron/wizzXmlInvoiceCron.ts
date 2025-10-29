import * as cron from 'node-cron';
import dayjs from 'dayjs';
import { dispatchDay } from '../services/xmlInvoiceDispatch.service';

let job: { stop: () => void } | null = null;

export function initWizzXmlInvoiceCron(): void {
  if (job) job.stop();
  // Run at 00:15 every day (processes YESTERDAY's operations, 5 minutes after email dispatch)
  // NOTE: Scheduled after midnight to process the completed previous day's operations
  // This avoids timezone issues with 23:55 scheduling and ensures all operations are finalized
  const cronExpr = '15 0 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  console.log(`Zakazivanje Wizz XML invoice crona: ${cronExpr} TZ=${tz}`);

  job = cron.schedule(cronExpr, async () => {
    console.log('🔥🔥🔥 XML CRON CALLBACK TRIGGERED! 🔥🔥🔥');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Local: ${new Date().toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
    
    const timeoutId = setTimeout(() => {
      console.error(`Wizz XML invoice cron timed out after 15 minutes`);
      process.exit(1); // Force restart if stuck
    }, 15 * 60 * 1000); // 15 minutes timeout
    
    // Process operations for the correct day
    // If cron runs after midnight (00:00-05:59), process YESTERDAY's operations
    // If cron runs before midnight (06:00-23:59), process TODAY's operations
    const now = dayjs();
    const currentHour = now.hour();
    const targetDate = (currentHour >= 0 && currentHour < 6) 
      ? now.subtract(1, 'day').toDate()  // After midnight → yesterday
      : now.toDate();                     // Before midnight → today
    
    const targetDateStr = dayjs(targetDate).format('YYYY-MM-DD');
    console.log(`Wizz XML invoice cron start za dan ${targetDateStr} (current hour: ${currentHour})`);
    try {
      console.log(`Wizz XML invoice cron: pokretanje dispatchDay za ${targetDateStr}`);
      const result = await dispatchDay(targetDate);
      console.log(`Wizz XML invoice cron završio: ukupno=${result.total}, uspešno=${result.results?.filter((r: any) => r.success).length || 0}, neuspešno=${result.results?.filter((r: any) => !r.success).length || 0}`);
    } catch (err) {
      console.error('Greška u Wizz XML invoice cron-u:', err);
      console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace available');
    } finally {
      clearTimeout(timeoutId);
    }
  }); // Timezone parameter removed - system timezone (Europe/Sarajevo) is used
  
  console.log(`✅ Wizz XML invoice cron initialized (using system timezone)`);
}




