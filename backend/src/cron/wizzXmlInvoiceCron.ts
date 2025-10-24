import * as cron from 'node-cron';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { dispatchDay } from '../services/xmlInvoiceDispatch.service';

let job: { stop: () => void } | null = null;

export function initWizzXmlInvoiceCron(): void {
  if (job) job.stop();
  const cronExpr = '55 23 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  logger.info(`Zakazivanje Wizz XML invoice crona: ${cronExpr} TZ=${tz}`);

  job = cron.schedule(cronExpr, async () => {
    const timeoutId = setTimeout(() => {
      logger.error(`Wizz XML invoice cron timed out after 15 minutes`);
      process.exit(1); // Force restart if stuck
    }, 15 * 60 * 1000); // 15 minutes timeout
    
    const todayLocal = dayjs().format('YYYY-MM-DD');
    logger.info(`Wizz XML invoice cron start za dan ${todayLocal}`);
    try {
      logger.info(`Wizz XML invoice cron: pokretanje dispatchDay za ${todayLocal}`);
      const result = await dispatchDay(new Date());
      logger.info(`Wizz XML invoice cron završio: ukupno=${result.total}, uspešno=${result.results?.filter((r: any) => r.success).length || 0}, neuspešno=${result.results?.filter((r: any) => !r.success).length || 0}`);
    } catch (err) {
      logger.error('Greška u Wizz XML invoice cron-u:', err);
      logger.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace available');
    } finally {
      clearTimeout(timeoutId);
    }
  }, { timezone: tz });
}




