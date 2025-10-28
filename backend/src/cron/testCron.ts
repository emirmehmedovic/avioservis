import * as cron from 'node-cron';
import { logger } from '../utils/logger';

/**
 * Test cron job to verify cron is working
 */
export function initTestCron(): void {
  const tz = process.env.TZ || 'Europe/Sarajevo';

  // Test cron koji će se pokrenuti u 00:15
  const testCronExpression = '15 0 * * *';
  
  logger.info(`🧪 Test cron job scheduled for 00:15: ${testCronExpression} (timezone: ${tz})`);

  cron.schedule(testCronExpression, async () => {
    const now = new Date();
    logger.info('');
    logger.info('═══════════════════════════════════════════════════');
    logger.info(`🧪 TEST CRON TRIGGERED SUCCESSFULLY! 🎉`);
    logger.info(`🧪 Time: ${now.toISOString()}`);
    logger.info(`🧪 Local: ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
    logger.info(`🧪 This confirms that node-cron IS WORKING PROPERLY!`);
    logger.info('═══════════════════════════════════════════════════');
    logger.info('');
  }, {
    timezone: tz
  });

  // Dodatni test - svake 2 minute (za brzu provjeru)
  const frequentTestExpression = '*/2 * * * *';
  
  logger.info(`🧪 Frequent test cron scheduled (every 2 minutes): ${frequentTestExpression} (timezone: ${tz})`);

  cron.schedule(frequentTestExpression, async () => {
    const now = new Date();
    logger.info(`🧪 [FREQUENT TEST] Cron tick at ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
  }, {
    timezone: tz
  });

  logger.info(`✅ Test cron jobs initialized`);
}

