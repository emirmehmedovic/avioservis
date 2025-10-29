import * as cron from 'node-cron';
import dayjs from 'dayjs';
import { dispatchDay } from '../services/xmlInvoiceDispatch.service';

let job: { stop: () => void } | null = null;

export function initWizzXmlInvoiceCron(): void {
  if (job) job.stop();
  const cronExpr = '55 23 * * *';
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
    
    const todayLocal = dayjs().format('YYYY-MM-DD');
    console.log(`Wizz XML invoice cron start za dan ${todayLocal}`);
    try {
      console.log(`Wizz XML invoice cron: pokretanje dispatchDay za ${todayLocal}`);
      const result = await dispatchDay(new Date());
      console.log(`Wizz XML invoice cron završio: ukupno=${result.total}, uspešno=${result.results?.filter((r: any) => r.success).length || 0}, neuspešno=${result.results?.filter((r: any) => !r.success).length || 0}`);
    } catch (err) {
      console.error('Greška u Wizz XML invoice cron-u:', err);
      console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace available');
    } finally {
      clearTimeout(timeoutId);
    }
  }, { timezone: tz });
}




