import cron from 'node-cron';
import { PrismaClient, XmlDispatchStatus, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

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
  cron.schedule('0 6 * * *', async () => {
    try {
      logger.info('Starting payment status update cron job...');
      const result = await updateExpiredAndOverdueInvoices();
      logger.info(`Payment status cron job completed: ${result.overdueCount} overdue, ${result.expiredCount} expired`);
    } catch (error) {
      logger.error('Payment status cron job failed:', error);
    }
  }, {
    timezone: 'Europe/Sarajevo'
  });

  logger.info('Payment status cron job scheduled: daily at 06:00 (Europe/Sarajevo)');
}

// Export the function for manual triggering
export { updateExpiredAndOverdueInvoices };
