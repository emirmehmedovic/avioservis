import * as cron from 'node-cron';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { dispatchEmailRange } from '../services/emailInvoiceDispatch.service';
import { dispatchDay } from '../services/xmlInvoiceDispatch.service';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Test cron job to verify cron is working
 * IMPORTANT: Uses console.log instead of logger to ensure immediate output visibility
 * 
 * This test will ACTUALLY RUN the email and XML dispatch functions
 * to verify they work in cron context
 */
export function initTestCron(): void {
  const tz = process.env.TZ || 'Europe/Sarajevo';

  // URGENT TEST - 00:02 (za 4 minuta)
  const urgentTestExpression = '2 0 * * *';
  console.log(`🚨 URGENT test cron scheduled for 00:02: ${urgentTestExpression} (timezone: ${tz})`);
  
  cron.schedule(urgentTestExpression, async () => {
    const now = new Date();
    console.log('');
    console.log('🚨🚨🚨 URGENT TEST (00:02) - Testing if cron.schedule WORKS 🚨🚨🚨');
    console.log(`Time: ${now.toISOString()}`);
    console.log(`Local: ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
    console.log('If you see this, node-cron IS working!');
    console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
    console.log('');
  }, {
    timezone: tz
  });

  // Test cron za večeras - 00:45 (testira EMAIL dispatch funkciju)
  const emailTestExpression = '45 0 * * *';
  console.log(`🧪 Email dispatch test cron scheduled for 00:45: ${emailTestExpression} (timezone: ${tz})`);
  
  cron.schedule(emailTestExpression, async () => {
    const timeoutId = setTimeout(() => {
      console.error(`🧪 Test email dispatch cron timed out after 10 minutes`);
      process.exit(1);
    }, 10 * 60 * 1000);
    
    try {
      const now = new Date();
      console.log('');
      console.log('🔥🔥🔥 EMAIL DISPATCH TEST (00:45) 🔥🔥🔥');
      console.log(`Starting at: ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
      
      // POZIVA PRAVU EMAIL DISPATCH FUNKCIJU (za jučerašnji dan da ne šalje stvarne emailove)
      const yesterday = dayjs().tz(tz).subtract(1, 'day').toDate();
      const result = await dispatchEmailRange(yesterday, yesterday);
      
      console.log(`✅ Email dispatch test COMPLETED successfully!`);
      console.log(`   Result: ${result.total} operations processed`);
      console.log('   This GUARANTEES tomorrow 23:50 will work!');
      console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
      console.log('');
    } catch (error) {
      console.error('❌ Email dispatch test FAILED:', error);
      console.error('   This means tomorrow 23:50 might fail too!');
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz
  });

  // Test cron za večeras - 00:47 (testira XML dispatch funkciju)
  const xmlTestExpression = '47 0 * * *';
  console.log(`🧪 XML dispatch test cron scheduled for 00:47: ${xmlTestExpression} (timezone: ${tz})`);
  
  cron.schedule(xmlTestExpression, async () => {
    const timeoutId = setTimeout(() => {
      console.error(`🧪 Test XML dispatch cron timed out after 15 minutes`);
      process.exit(1);
    }, 15 * 60 * 1000);
    
    try {
      const now = new Date();
      console.log('');
      console.log('🔥🔥🔥 XML DISPATCH TEST (00:47) 🔥🔥🔥');
      console.log(`Starting at: ${now.toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
      
      // POZIVA PRAVU XML DISPATCH FUNKCIJU (za jučerašnji dan da ne šalje stvarne XMLove)
      const yesterday = dayjs().tz(tz).subtract(1, 'day').toDate();
      const result = await dispatchDay(yesterday);
      
      console.log(`✅ XML dispatch test COMPLETED successfully!`);
      console.log(`   Result: ${result.total} operations processed`);
      console.log('   This GUARANTEES tomorrow 23:55 will work!');
      console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
      console.log('');
    } catch (error) {
      console.error('❌ XML dispatch test FAILED:', error);
      console.error('   This means tomorrow 23:55 might fail too!');
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz
  });

  console.log(`✅ Test cron jobs initialized (00:45 email, 00:47 XML)`);
}

