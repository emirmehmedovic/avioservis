import cron from 'node-cron';
import dayjs from 'dayjs';
import { dispatchDay } from '../services/xmlInvoiceDispatch.service';

let job: { stop: () => void } | null = null;

export function initWizzXmlInvoiceCron(): void {
  if (job) job.stop();
  // Run at 05:40 UTC = 06:40 Sarajevo (zimi) every day (processes YESTERDAY's operations)
  // NOTE: Scheduled after early morning maintenance (vacuum, backups)
  // This ensures database is stable and all operations are finalized
  const cronExpr = '40 5 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  console.log(`[${new Date().toISOString()}] Zakazivanje Wizz XML invoice crona: ${cronExpr} UTC (06:40 Sarajevo zimi)`);

  job = cron.schedule(cronExpr, async () => {
    console.log(`[${new Date().toISOString()}] 🔥🔥🔥 XML CRON CALLBACK TRIGGERED! 🔥🔥🔥`);
    console.log(`[${new Date().toISOString()}] UTC Time: ${new Date().toISOString()}`);
    console.log(`[${new Date().toISOString()}] Local: ${new Date().toLocaleString('sr-Latn-BA', { timeZone: tz })}`);

    let isProcessing = true;
    const timeoutId = setTimeout(() => {
      if (isProcessing) {
        console.error(`[${new Date().toISOString()}] Wizz XML invoice cron timed out after 15 minutes - still processing`);
      }
    }, 15 * 60 * 1000); // 15 minutes timeout

    // Process operations for YESTERDAY (runs at 06:40)
    // This CRON job is scheduled for early morning (06:40)
    // and always processes the previous day's operations
    const now = dayjs().tz(tz);
    const targetDate = now.subtract(1, 'day').toDate();

    const targetDateStr = dayjs(targetDate).format('YYYY-MM-DD');
    console.log(`[${new Date().toISOString()}] Wizz XML invoice cron start za dan ${targetDateStr}`);
    try {
      console.log(`[${new Date().toISOString()}] Wizz XML invoice cron: pokretanje dispatchDay za ${targetDateStr}`);
      const result = await dispatchDay(targetDate);
      console.log(`[${new Date().toISOString()}] Wizz XML invoice cron završio: ukupno=${result.total}, uspešno=${result.results?.filter((r: any) => r.success).length || 0}, neuspešno=${result.results?.filter((r: any) => !r.success).length || 0}`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Greška u Wizz XML invoice cron-u:`, err);
      console.error(`[${new Date().toISOString()}] Stack trace:`, err instanceof Error ? err.stack : 'No stack trace available');
    } finally {
      isProcessing = false;
      clearTimeout(timeoutId);
    }
  });

  console.log(`[${new Date().toISOString()}] ✅ Wizz XML invoice cron initialized (UTC mode)`);
}




