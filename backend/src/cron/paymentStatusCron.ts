import cron from 'node-cron';
import { XmlDispatchStatus, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

/**
 * Function to update expired and overdue invoices
 */
const updateExpiredAndOverdueInvoices = async () => {
  try {
    const now = new Date();
    const sevenDaysAgo = dayjs().subtract(7, 'days').toDate();
    const fifteenDaysAgo = dayjs().subtract(15, 'days').toDate();
    
    // Mark invoices as OVERDUE if sent 7+ days ago and still PENDING
    const overdueUpdate = await prisma.xmlInvoiceDispatch.updateMany({
      where: {
        status: XmlDispatchStatus.SENT,
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

    // Mark invoices as EXPIRED if sent 15+ days ago and not PAID
    const expiredUpdate = await prisma.xmlInvoiceDispatch.updateMany({
      where: {
        status: XmlDispatchStatus.SENT,
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
      logger.info(`Payment status update: ${overdueUpdate.count} invoices marked as OVERDUE, ${expiredUpdate.count} invoices marked as EXPIRED`);
    }

    return {
      overdueCount: overdueUpdate.count,
      expiredCount: expiredUpdate.count
    };

  } catch (error) {
    logger.error('Error updating payment statuses:', error);
    throw error;
  }
};

/**
 * Initialize payment status cron job
 */
export function initPaymentStatusCron(): void {
  // Run every day at 06:00 to update payment statuses
  const tz = process.env.TZ || 'Europe/Sarajevo';

  cron.schedule('0 6 * * *', async () => {
    let isProcessing = true;
    const timeoutId = setTimeout(() => {
      if (isProcessing) {
        console.error(`[${new Date().toISOString()}] Payment status cron job timed out after 5 minutes - still processing`);
      }
    }, 5 * 60 * 1000); // 5 minutes timeout

    try {
      console.log(`[${new Date().toISOString()}] Starting payment status update cron job...`);
      const result = await updateExpiredAndOverdueInvoices();
      console.log(`[${new Date().toISOString()}] Payment status cron job completed: ${result.overdueCount} overdue, ${result.expiredCount} expired`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Payment status cron job failed:`, error);
    } finally {
      isProcessing = false;
      clearTimeout(timeoutId);
    }
  }, {
    timezone: tz
  });

  console.log(`[${new Date().toISOString()}] ✅ Payment status cron job scheduled: daily at 06:00 (timezone: ${tz})`);
}

// Export the function for manual triggering
export { updateExpiredAndOverdueInvoices };
