import { Router, Response, NextFunction } from 'express';
import {
  getEmailInvoiceDispatches,
  dispatchEmailInvoiceForOperation,
  dispatchEmailInvoicesForDay,
  dispatchEmailInvoicesForRange,
  prepareEmailInvoicesForDay,
  prepareEmailInvoicesForRange,
  getEmailInvoiceStats,
  previewEmailTemplate,
  updateEmailInvoicePaymentStatus,
  externalEmailPaymentUpdate
} from '../controllers/emailInvoice.controller';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware function to check if user has required role (ADMIN or KONTROLA)
const requireAdminOrKontrola = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['ADMIN', 'KONTROLA'].includes(req.user.role)) {
    res.status(403).json({ message: 'Nedozvoljen pristup.' });
    return;
  }
  next();
};

// Apply authentication to all routes
router.use(authenticateToken);

// Apply role-based access control (ADMIN and KONTROLA only)
router.use(requireAdminOrKontrola);

// GET /api/invoices/email - List email invoice dispatches
router.get('/', getEmailInvoiceDispatches);

// GET /api/invoices/email/stats - Get email invoice statistics
router.get('/stats', getEmailInvoiceStats);

// POST /api/invoices/email/dispatch/operation/:operationId - Dispatch single operation
router.post('/dispatch/operation/:operationId', dispatchEmailInvoiceForOperation);

// POST /api/invoices/email/dispatch/day/:date - Dispatch all operations for a day
router.post('/dispatch/day/:date', dispatchEmailInvoicesForDay);

// POST /api/invoices/email/dispatch/range - Dispatch operations for a date range
router.post('/dispatch/range', dispatchEmailInvoicesForRange);

// POST /api/invoices/email/prepare/day/:date - Prepare email dispatches for a day
router.post('/prepare/day/:date', prepareEmailInvoicesForDay);

// POST /api/invoices/email/prepare/range - Prepare email dispatches for a date range
router.post('/prepare/range', prepareEmailInvoicesForRange);

// GET /api/invoices/email/preview/:operationId - Preview email template for operation
router.get('/preview/:operationId', previewEmailTemplate);

// Payment Status Routes
// PUT /api/invoices/email/payment/:id - Update payment status for email invoice
router.put('/payment/:id', updateEmailInvoicePaymentStatus);

// POST /api/invoices/email/external-payment - External payment status update
router.post('/external-payment', externalEmailPaymentUpdate);

export default router;
