import * as cron from 'node-cron';

/**
 * Test cron job to verify cron is working
 * IMPORTANT: Uses console.log instead of logger to ensure immediate output visibility
 */
export function initTestCron(): void {
  const tz = process.env.TZ || 'Europe/Sarajevo';

  // Test cron koji će se pokrenuti u 00:15
  const testCronExpression = '15 0 * * *';
  
  console.log(`🧪 Test cron job scheduled for 00:15: ${testCronExpression} (timezone: ${tz})`);

  cron.schedule(testCronExpression, async () => {
    const now = new Date();
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🧪 TEST CRON TRIGGERED SUCCESSFULLY! 🎉`);
    console.log(`🧪 Time: ${now.toISOString()}`);
    console.log(`🧪 Local: ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
    console.log(`🧪 This confirms that node-cron IS WORKING PROPERLY!`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  }, {
    timezone: tz
  });

  // Dodatni test - svake 2 minute (za brzu provjeru)
  const frequentTestExpression = '*/2 * * * *';
  
  console.log(`🧪 Frequent test cron scheduled (every 2 minutes): ${frequentTestExpression} (timezone: ${tz})`);

  cron.schedule(frequentTestExpression, async () => {
    const now = new Date();
    console.log(`🧪 [FREQUENT TEST] Cron tick at ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
  }, {
    timezone: tz
  });

  console.log(`✅ Test cron jobs initialized`);
}

