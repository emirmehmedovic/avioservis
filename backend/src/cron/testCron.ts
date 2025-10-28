import * as cron from 'node-cron';

/**
 * Test cron job to verify cron is working
 * IMPORTANT: Uses console.log instead of logger to ensure immediate output visibility
 */
export function initTestCron(): void {
  const tz = process.env.TZ || 'Europe/Sarajevo';

  // Test cron za večeras - 00:40 (simulira production vrijeme kao 23:50)
  const tonightTestExpression = '40 0 * * *';
  console.log(`🧪 Tonight test cron scheduled for 00:40: ${tonightTestExpression} (timezone: ${tz})`);
  
  cron.schedule(tonightTestExpression, async () => {
    const now = new Date();
    console.log('');
    console.log('🔥🔥🔥 TONIGHT TEST (00:40 - simulates 23:50) 🔥🔥🔥');
    console.log(`Time: ${now.toISOString()}`);
    console.log(`Local: ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
    console.log('If you see this, cron will work tomorrow at 23:50!');
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('');
  }, {
    timezone: tz
  });

  console.log(`✅ Test cron job initialized (00:40)`);
}

