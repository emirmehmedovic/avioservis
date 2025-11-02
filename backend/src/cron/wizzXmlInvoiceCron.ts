import cron from 'node-cron';
import dayjs from 'dayjs';
import { dispatchDay } from '../services/xmlInvoiceDispatch.service';

let job: { stop: () => void } | null = null;

export function initWizzXmlInvoiceCron(): void {
  if (job) job.stop();
  // Run at 06:40 every day (processes YESTERDAY's operations)
  // NOTE: Scheduled after early morning maintenance (vacuum, backups)
  // This ensures database is stable and all operations are finalized
  const cronExpr = '40 6 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  console.log(`[${new Date().toISOString()}] Zakazivanje Wizz XML invoice crona: ${cronExpr} TZ=${tz}`);

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

    // Process operations for the correct day
    // If cron runs after midnight (00:00-05:59), process YESTERDAY's operations
    // If cron runs before midnight (06:00-23:59), process TODAY's operations
    const now = dayjs().tz(tz);
    const currentHour = now.hour();
    const targetDate = (currentHour >= 0 && currentHour < 6)
      ? now.subtract(1, 'day').toDate()  // After midnight → yesterday
      : now.toDate();                     // Before midnight → today

    const targetDateStr = dayjs(targetDate).format('YYYY-MM-DD');
    console.log(`[${new Date().toISOString()}] Wizz XML invoice cron start za dan ${targetDateStr} (current hour: ${currentHour})`);
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
  }, {
    timezone: tz  // ✅ EKSPLICITNO POSTAVLJENO
  });

  console.log(`[${new Date().toISOString()}] ✅ Wizz XML invoice cron initialized (timezone: ${tz})`);
}




