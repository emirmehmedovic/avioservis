import cron from 'node-cron';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { dispatchEmailRange, dispatchOneEmailOperation } from '../services/emailInvoiceDispatch.service';
import { EmailDispatchStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

dayjs.extend(utc);
dayjs.extend(timezone);

export function initEmailInvoiceCron(): void {
  // Run at 06:35 every day (processes YESTERDAY's operations)
  // NOTE: Scheduled after early morning maintenance (vacuum, backups)
  // This ensures database is stable and all operations are finalized
  // NOTE: After email payment status update (06:30) to avoid table locks
  const cronExpression = '35 6 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  console.log(`[${new Date().toISOString()}] Zakazivanje email invoice crona: ${cronExpression} TZ=${tz}`);

  // Email dispatch main job
  cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] 🔥🔥🔥 EMAIL CRON CALLBACK TRIGGERED! 🔥🔥🔥`);
    console.log(`[${new Date().toISOString()}] UTC Time: ${new Date().toISOString()}`);
    console.log(`[${new Date().toISOString()}] Local: ${new Date().toLocaleString('sr-Latn-BA', { timeZone: tz })}`);

    let isProcessing = true;
    const timeoutId = setTimeout(() => {
      if (isProcessing) {
        console.error(`[${new Date().toISOString()}] Email invoice cron job timed out after 10 minutes - still processing`);
      }
    }, 10 * 60 * 1000); // 10 minutes timeout
    
    try {
      console.log(`[${new Date().toISOString()}] Starting email invoice dispatch cron job...`);

      // Process operations for the correct day
      // If cron runs after midnight (00:00-05:59), process YESTERDAY's operations
      // If cron runs before midnight (06:00-23:59), process TODAY's operations
      const now = dayjs().tz(tz);
      const currentHour = now.hour();
      const targetDate = (currentHour >= 0 && currentHour < 6)
        ? now.subtract(1, 'day').toDate()  // After midnight → yesterday
        : now.toDate();                     // Before midnight → today

      console.log(`[${new Date().toISOString()}] Processing operations for date: ${dayjs(targetDate).format('YYYY-MM-DD')} (current hour: ${currentHour})`);

      const result = await dispatchEmailRange(targetDate, targetDate);

      console.log(`[${new Date().toISOString()}] Email invoice dispatch completed:`, {
        daysProcessed: result.daysProcessed,
        totalOperations: result.total,
        date: dayjs(targetDate).format('YYYY-MM-DD')
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
      isProcessing = false;
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz  // ✅ EKSPLICITNO POSTAVLJENO
  });

  console.log(`[${new Date().toISOString()}] ✅ Email invoice cron job scheduled: ${cronExpression} (timezone: ${tz})`);

  // Retry failed emails at 07:00 (25 minutes after main cron, after XML dispatch finishes)
  const retryCronExpression = '0 7 * * *';

  cron.schedule(retryCronExpression, async () => {
    let isRetryProcessing = true;
    const timeoutId = setTimeout(() => {
      if (isRetryProcessing) {
        console.error(`[${new Date().toISOString()}] Email invoice retry cron job timed out after 5 minutes - still processing`);
      }
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
      isRetryProcessing = false;
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz  // ✅ EKSPLICITNO POSTAVLJENO
  });

  console.log(`[${new Date().toISOString()}] ✅ Email invoice retry cron job scheduled: ${retryCronExpression} (timezone: ${tz})`);
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
