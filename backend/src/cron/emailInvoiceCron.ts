import * as cron from 'node-cron';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { dispatchEmailRange } from '../services/emailInvoiceDispatch.service';

dayjs.extend(utc);
dayjs.extend(timezone);

export function initEmailInvoiceCron(): void {
  // Run at 23:50 every day (10 minutes before XML invoice cron)
  const cronExpression = '50 23 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  cron.schedule(cronExpression, async () => {
    try {
      console.log(`[${new Date().toISOString()}] Starting email invoice dispatch cron job...`);
      
      // Process today's operations
      const today = dayjs().tz(tz).toDate();
      const result = await dispatchEmailRange(today, today);
      
      console.log(`[${new Date().toISOString()}] Email invoice dispatch completed:`, {
        daysProcessed: result.daysProcessed,
        totalOperations: result.total,
        date: dayjs(today).format('YYYY-MM-DD')
      });

      // Log summary for each day processed
      for (const day of result.days) {
        const successCount = day.results.filter((r: any) => r.success && !r.skipped).length;
        const failedCount = day.results.filter((r: any) => !r.success && !r.skipped).length;
        const skippedCount = day.results.filter((r: any) => r.skipped).length;
        
        console.log(`[${new Date().toISOString()}] Day ${day.date}: ${day.operations} operations, ${successCount} sent, ${failedCount} failed, ${skippedCount} skipped`);
        
        // Log failed operations
        const failedOps = day.results.filter((r: any) => !r.success && !r.skipped);
        if (failedOps.length > 0) {
          console.error(`[${new Date().toISOString()}] Failed email dispatches for ${day.date}:`, 
            failedOps.map((op: any) => ({ opId: op.opId, error: op.error }))
          );
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Email invoice cron job failed:`, error);
    }
  }, {
    timezone: tz
  });

  console.log(`Email invoice cron job scheduled: ${cronExpression} (timezone: ${tz})`);
}

// Function to manually trigger email dispatch for a specific date
export async function manualEmailDispatch(date: string): Promise<any> {
  try {
    const targetDate = dayjs(date).toDate();
    const result = await dispatchEmailRange(targetDate, targetDate);
    
    console.log(`Manual email dispatch for ${date} completed:`, result);
    return result;
  } catch (error) {
    console.error(`Manual email dispatch for ${date} failed:`, error);
    throw error;
  }
}
