import * as cron from 'node-cron';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { dispatchEmailRange, dispatchOneEmailOperation } from '../services/emailInvoiceDispatch.service';
import { EmailDispatchStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

dayjs.extend(utc);
dayjs.extend(timezone);

export function initEmailInvoiceCron(): void {
  // Run at 23:50 every day (10 minutes before XML invoice cron)
  const cronExpression = '50 23 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  cron.schedule(cronExpression, async () => {
    console.log('🔥🔥🔥 EMAIL CRON CALLBACK TRIGGERED! 🔥🔥🔥');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Local: ${new Date().toLocaleString('sr-Latn-BA', { timeZone: tz })}`);
    
    const timeoutId = setTimeout(() => {
      console.error(`[${new Date().toISOString()}] Email invoice cron job timed out after 10 minutes`);
      process.exit(1); // Force restart if stuck
    }, 10 * 60 * 1000); // 10 minutes timeout
    
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
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz
  });

  console.log(`Email invoice cron job scheduled: ${cronExpression} (timezone: ${tz})`);

  // Retry failed emails at 23:57 (7 minutes after main cron)
  const retryCronExpression = '57 23 * * *';
  
  cron.schedule(retryCronExpression, async () => {
    const timeoutId = setTimeout(() => {
      console.error(`[${new Date().toISOString()}] Email invoice retry cron job timed out after 5 minutes`);
      process.exit(1); // Force restart if stuck
    }, 5 * 60 * 1000); // 5 minutes timeout
    
    try {
      console.log(`[${new Date().toISOString()}] Starting email invoice retry cron job...`);
      
      // Find failed email dispatches from today
      const today = dayjs().tz(tz).startOf('day').toDate();
      const tomorrow = dayjs().tz(tz).add(1, 'day').startOf('day').toDate();
      
      const failedDispatches = await prisma.emailInvoiceDispatch.findMany({
        where: {
          status: EmailDispatchStatus.FAILED,
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          attempts: {
            lt: 3 // Only retry if less than 3 attempts
          }
        },
        include: {
          fuelingOperation: {
            include: {
              airline: true,
              tank: true,
              documents: true
            }
          }
        }
      });

      console.log(`[${new Date().toISOString()}] Found ${failedDispatches.length} failed email dispatches to retry`);

      if (failedDispatches.length === 0) {
        console.log(`[${new Date().toISOString()}] No failed email dispatches to retry`);
        return;
      }

      let retrySuccessCount = 0;
      let retryFailedCount = 0;

      for (const dispatch of failedDispatches) {
        try {
          console.log(`[${new Date().toISOString()}] Retrying email dispatch for operation ${dispatch.fuelingOperationId}...`);
          
          const result = await dispatchOneEmailOperation(dispatch.fuelingOperationId, true); // Force retry
          
          if (result.success) {
            retrySuccessCount++;
            console.log(`[${new Date().toISOString()}] ✅ Retry successful for operation ${dispatch.fuelingOperationId}`);
          } else {
            retryFailedCount++;
            console.log(`[${new Date().toISOString()}] ❌ Retry failed for operation ${dispatch.fuelingOperationId}: ${result.error || 'Unknown error'}`);
          }
        } catch (error: any) {
          retryFailedCount++;
          console.error(`[${new Date().toISOString()}] ❌ Retry error for operation ${dispatch.fuelingOperationId}:`, error.message);
        }
      }

      console.log(`[${new Date().toISOString()}] Email invoice retry completed: ${retrySuccessCount} successful, ${retryFailedCount} failed`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Email invoice retry cron job failed:`, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz
  });

  console.log(`Email invoice retry cron job scheduled: ${retryCronExpression} (timezone: ${tz})`);
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

// Function to manually retry failed email dispatches
export async function manualRetryFailedEmails(date?: string): Promise<any> {
  try {
    const tz = process.env.TZ || 'Europe/Sarajevo';
    let targetDate: Date;
    
    if (date) {
      targetDate = dayjs(date).tz(tz).startOf('day').toDate();
    } else {
      targetDate = dayjs().tz(tz).startOf('day').toDate();
    }
    
    const tomorrow = dayjs(targetDate).add(1, 'day').startOf('day').toDate();
    
    const failedDispatches = await prisma.emailInvoiceDispatch.findMany({
      where: {
        status: EmailDispatchStatus.FAILED,
        createdAt: {
          gte: targetDate,
          lt: tomorrow
        },
        attempts: {
          lt: 3
        }
      },
      include: {
        fuelingOperation: {
          include: {
            airline: true,
            tank: true,
            documents: true
          }
        }
      }
    });

    console.log(`Manual retry found ${failedDispatches.length} failed email dispatches`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const dispatch of failedDispatches) {
      try {
        const result = await dispatchOneEmailOperation(dispatch.fuelingOperationId, true);
        results.push({ opId: dispatch.fuelingOperationId, ...result });
        
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error: any) {
        results.push({ opId: dispatch.fuelingOperationId, error: error.message });
        failedCount++;
      }
    }

    const summary = {
      total: failedDispatches.length,
      successful: successCount,
      failed: failedCount,
      results
    };

    console.log(`Manual retry completed:`, summary);
    return summary;
  } catch (error) {
    console.error(`Manual retry failed:`, error);
    throw error;
  }
}
