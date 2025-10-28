import cron from 'node-cron';
import { EmailDispatchStatus, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { prisma } from '../lib/prisma';

/**
 * Function to update expired and overdue email invoices
 */
const updateExpiredAndOverdueEmailInvoices = async () => {
  try {
    const now = new Date();
    const sevenDaysAgo = dayjs().subtract(7, 'days').toDate();
    const fifteenDaysAgo = dayjs().subtract(15, 'days').toDate();
    
    // Mark email invoices as OVERDUE if sent 7+ days ago and still PENDING
    const overdueUpdate = await prisma.emailInvoiceDispatch.updateMany({
      where: {
        status: EmailDispatchStatus.SENT,
        paymentStatus: PaymentStatus.PENDING,
        dispatchedAt: {
          lte: sevenDaysAgo,
          gt: fifteenDaysAgo
        }
      },
      data: {
        paymentStatus: PaymentStatus.OVERDUE
      }
    });

    // Mark email invoices as EXPIRED if sent 15+ days ago and not PAID
    const expiredUpdate = await prisma.emailInvoiceDispatch.updateMany({
      where: {
        status: EmailDispatchStatus.SENT,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
        dispatchedAt: {
          lte: fifteenDaysAgo
        }
      },
      data: {
        paymentStatus: PaymentStatus.EXPIRED
      }
    });

    if (overdueUpdate.count > 0 || expiredUpdate.count > 0) {
      console.log(`Email payment status update: ${overdueUpdate.count} invoices marked as OVERDUE, ${expiredUpdate.count} invoices marked as EXPIRED`);
    }

    return {
      overdueCount: overdueUpdate.count,
      expiredCount: expiredUpdate.count
    };

  } catch (error) {
    console.error('Error updating email payment statuses:', error);
    throw error;
  }
};

/**
 * Initialize email payment status cron job
 */
export function initEmailPaymentStatusCron(): void {
  // Run every day at 06:30 to update email payment statuses (30 min after XML)
  const cronExpression = '30 6 * * *';
  const tz = process.env.TZ || 'Europe/Sarajevo';

  cron.schedule(cronExpression, async () => {
    const timeoutId = setTimeout(() => {
      console.error(`[${new Date().toISOString()}] Email payment status cron job timed out after 5 minutes`);
      process.exit(1); // Force restart if stuck
    }, 5 * 60 * 1000); // 5 minutes timeout
    
    try {
      console.log(`[${new Date().toISOString()}] Starting email payment status update cron job...`);
      const result = await updateExpiredAndOverdueEmailInvoices();
      console.log(`[${new Date().toISOString()}] Email payment status cron job completed: ${result.overdueCount} overdue, ${result.expiredCount} expired`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Email payment status cron job failed:`, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz
  });

  console.log(`Email payment status cron job scheduled: ${cronExpression} (timezone: ${tz})`);
}

// Export the function for manual triggering
export { updateExpiredAndOverdueEmailInvoices };


