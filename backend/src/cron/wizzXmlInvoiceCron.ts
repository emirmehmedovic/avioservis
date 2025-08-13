import * as cron from 'node-cron';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { dispatchDay } from '../services/xmlInvoiceDispatch.service';

let job: { stop: () => void } | null = null;

export function initWizzXmlInvoiceCron(): void {
  if (job) job.stop();
  const cronExpr = '0 23 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  logger.info(`Zakazivanje Wizz XML invoice crona: ${cronExpr} TZ=${tz}`);

  job = cron.schedule(cronExpr, async () => {
    const todayLocal = dayjs().format('YYYY-MM-DD');
    logger.info(`Wizz XML invoice cron start za dan ${todayLocal}`);
    try {
      const result = await dispatchDay(new Date());
      logger.info(`Wizz XML invoice cron završio: ukupno=${result.total}`);
    } catch (err) {
      logger.error('Greška u Wizz XML invoice cron-u:', err);
    }
  }, { timezone: tz });
}




